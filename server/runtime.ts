import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { WebSocket } from 'ws'
import {
  ASPECT_RATIO_HINTS,
  ERA_AGENT_DEFAULT_HOST,
  ERA_AGENT_DEFAULT_PORT,
  HIGHLIGHT_STYLES,
  type BridgeCommand,
  type BridgeResponse,
  type EraProjectMeta,
  type EraProjectSnapshot,
  type HighlightRange,
} from '../src/agent/protocol.ts'
import { applyHighlightRanges, emptyHighlightMaps } from '../src/agent/highlightRanges.ts'

export interface StoredProject {
  id: string
  snapshot: EraProjectSnapshot
  updatedAt: string
}

interface PendingBridgeCall {
  resolve: (value: BridgeResponse) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const DEFAULT_CONFIG = {
  titleFontId: 'song',
  titleFontFamily: '"Noto Serif SC", serif',
  headingFontId: 'song',
  headingFontFamily: '"Noto Serif SC", serif',
  bodyFontId: 'song',
  bodyFontFamily: '"Noto Serif SC", serif',
  codeFontId: 'menlo',
  codeFontFamily: 'Menlo, monospace',
  titleFontSize: 56,
  headingFontSize: 20,
  bodyFontSize: 13,
  codeFontSize: 12,
  titleLineHeight: 1.18,
  bodyLineHeight: 1.64,
  headingLineHeight: 1.18,
  codeLineHeight: 1.5,
  titleMarginTop: 1.2,
  titleMarginBottom: 0.32,
  headingMarginTop: 0.88,
  headingMarginBottom: 0.32,
  codeBackgroundColor: '#F2F2F2',
  paperColor: '#FBF7ED',
  aspectRatio: '9:16',
  backgroundType: 'solid',
  pageOverlay: 'grid',
  overlayStacked: false,
  topText: '',
  backgroundUrl: null,
  ...emptyHighlightMaps(),
  highlightPickerColor: '#FACC15',
}

function createBlockId() {
  return randomUUID()
}

function splitMarkdownToBlocks(markdown: string) {
  const text = markdown.trim()
  if (!text) return [] as { id: string; kind: 'markdown'; text: string }[]

  // 与前端 createDocumentFromMarkdown 一致：按解析后的块拆成 content blocks
  // 此处做轻量拆分：按空行分段，标题/列表行单独成块
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const chunks: string[] = []
  let paragraph: string[] = []
  let inCode = false
  let code: string[] = []

  const flushParagraph = () => {
    const joined = paragraph.join('\n').trim()
    if (joined) chunks.push(joined)
    paragraph = []
  }
  const flushCode = () => {
    if (code.length) chunks.push(['```', ...code, '```'].join('\n'))
    code = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (inCode) {
      if (line.trim().startsWith('```')) {
        inCode = false
        flushCode()
      } else {
        code.push(line)
      }
      continue
    }
    if (line.trim().startsWith('```')) {
      flushParagraph()
      inCode = true
      continue
    }
    if (!line.trim()) {
      flushParagraph()
      continue
    }
    if (
      line.startsWith('# ') ||
      /^#{2,6}\s/.test(line) ||
      /^[-*+]\s/.test(line) ||
      /^\d+\.\s/.test(line)
    ) {
      flushParagraph()
      chunks.push(line.trim())
      continue
    }
    paragraph.push(line)
  }
  flushParagraph()
  if (inCode) flushCode()

  return chunks.map((chunk) => ({
    id: createBlockId(),
    kind: 'markdown' as const,
    text: chunk,
  }))
}

function getDocumentMarkdown(document: { blocks: { kind: string; text?: string }[] }) {
  return document.blocks
    .filter((block) => block.kind === 'markdown' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n\n')
}

/** 解析 scoped markdown block 摘要（与前端 parseScopedMarkdown 的 id 规则对齐） */
export function summarizeContentBlocks(document: {
  blocks: { id: string; kind: string; text?: string }[]
}) {
  const result: { id: string; type: string; text: string; plainText: string; contentBlockId: string }[] =
    []

  for (const block of document.blocks) {
    if (block.kind !== 'markdown' || typeof block.text !== 'string') continue
    const lines = block.text.replace(/\r\n/g, '\n').split('\n')
    // 简化：每个 content block 通常已是单段；仍按 markdown 规则标 type
    let type = 'paragraph'
    let text = block.text
    const first = lines[0]?.trim() ?? ''
    if (first.startsWith('# ')) {
      type = 'title'
      text = first.slice(2).trim()
    } else if (/^#{2,6}\s/.test(first)) {
      type = 'heading'
      text = first.replace(/^#{2,6}\s+/, '').trim()
    } else if (first.startsWith('```')) {
      type = 'code'
      text = lines.slice(1, -1).join('\n')
    } else if (/^[-*+]\s/.test(first)) {
      type = 'list'
      text = first.replace(/^[-*+]\s+/, '')
    }
    const scopedId = `${block.id}::0::${type}`
    const plainText = text.replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1')
    result.push({
      id: scopedId,
      type,
      text,
      plainText,
      contentBlockId: block.id,
    })
  }
  return result
}

export class EraAgentRuntime {
  readonly host = process.env.ERA_AGENT_HOST ?? ERA_AGENT_DEFAULT_HOST
  readonly port = Number(process.env.ERA_AGENT_PORT ?? ERA_AGENT_DEFAULT_PORT)
  readonly outputDir = path.resolve(process.env.ERA_OUTPUT_DIR ?? path.join(process.cwd(), 'output'))

  private projects = new Map<string, StoredProject>()
  private bridges = new Set<WebSocket>()
  private pending = new Map<string, PendingBridgeCall>()

  createProject(input: {
    markdown?: string
    configPartial?: Record<string, unknown>
    meta?: EraProjectMeta
  }) {
    const markdown = input.markdown?.trim() ? input.markdown : '# 未命名\n\n请输入正文。'
    const document = {
      blocks: splitMarkdownToBlocks(markdown),
      assets: {},
    }
    const config = {
      ...DEFAULT_CONFIG,
      ...(input.configPartial ?? {}),
      underlineHighlightColors: {
        ...emptyHighlightMaps().underlineHighlightColors,
        ...((input.configPartial?.underlineHighlightColors as Record<string, string>) ?? {}),
      },
      brushHighlightColors: {
        ...emptyHighlightMaps().brushHighlightColors,
        ...((input.configPartial?.brushHighlightColors as Record<string, string>) ?? {}),
      },
      quoteHighlightColors: {
        ...emptyHighlightMaps().quoteHighlightColors,
        ...((input.configPartial?.quoteHighlightColors as Record<string, string>) ?? {}),
      },
      circleHighlightColors: {
        ...emptyHighlightMaps().circleHighlightColors,
        ...((input.configPartial?.circleHighlightColors as Record<string, string>) ?? {}),
      },
    }
    const id = randomUUID()
    const snapshot: EraProjectSnapshot = {
      version: 1,
      document,
      config,
      meta: input.meta,
    }
    const project: StoredProject = {
      id,
      snapshot,
      updatedAt: new Date().toISOString(),
    }
    this.projects.set(id, project)
    void this.pushSync(id)
    return this.projectSummary(project)
  }

  getProject(projectId: string) {
    const project = this.requireProject(projectId)
    return {
      projectId: project.id,
      updatedAt: project.updatedAt,
      snapshot: project.snapshot,
      blocks: summarizeContentBlocks(
        project.snapshot.document as { blocks: { id: string; kind: string; text?: string }[] },
      ),
      bridgeConnected: this.bridges.size > 0,
    }
  }

  setMarkdown(projectId: string, markdown: string) {
    const project = this.requireProject(projectId)
    const document = {
      blocks: splitMarkdownToBlocks(markdown),
      assets: {},
    }
    project.snapshot = {
      ...project.snapshot,
      document,
    }
    project.updatedAt = new Date().toISOString()
    void this.pushSync(projectId)
    return {
      projectId,
      blockCount: document.blocks.length,
      blocks: summarizeContentBlocks(document),
      markdown: getDocumentMarkdown(document),
    }
  }

  setTitle(projectId: string, title: string) {
    const project = this.requireProject(projectId)
    const document = project.snapshot.document as {
      blocks: { id: string; kind: string; text?: string }[]
      assets: Record<string, unknown>
    }
    const titleText = `# ${title.trim()}`
    const blocks = [...document.blocks]
    const titleIndex = blocks.findIndex(
      (block) => block.kind === 'markdown' && typeof block.text === 'string' && block.text.startsWith('# '),
    )
    if (titleIndex >= 0) {
      blocks[titleIndex] = { ...blocks[titleIndex], text: titleText }
    } else {
      blocks.unshift({ id: createBlockId(), kind: 'markdown', text: titleText })
    }
    project.snapshot = {
      ...project.snapshot,
      document: { ...document, blocks },
      meta: { ...project.snapshot.meta, title: title.trim() },
    }
    project.updatedAt = new Date().toISOString()
    void this.pushSync(projectId)
    return this.projectSummary(project)
  }

  updateConfig(projectId: string, patch: Record<string, unknown>) {
    const project = this.requireProject(projectId)
    const config = {
      ...(project.snapshot.config as Record<string, unknown>),
      ...patch,
    }
    project.snapshot = { ...project.snapshot, config }
    project.updatedAt = new Date().toISOString()
    void this.pushSync(projectId)
    const aspect = config.aspectRatio
    return {
      projectId,
      config,
      aspectHint:
        aspect === '3:4' || aspect === '9:16'
          ? ASPECT_RATIO_HINTS[aspect]
          : undefined,
    }
  }

  applyHighlights(projectId: string, ranges: HighlightRange[]) {
    const project = this.requireProject(projectId)
    const config = project.snapshot.config as Record<string, unknown>
    const current = {
      underlineHighlightColors: {
        ...((config.underlineHighlightColors as Record<string, string>) ?? {}),
      },
      brushHighlightColors: { ...((config.brushHighlightColors as Record<string, string>) ?? {}) },
      quoteHighlightColors: { ...((config.quoteHighlightColors as Record<string, string>) ?? {}) },
      circleHighlightColors: { ...((config.circleHighlightColors as Record<string, string>) ?? {}) },
    }
    const { maps, applied, errors } = applyHighlightRanges(current, ranges)
    project.snapshot = {
      ...project.snapshot,
      config: { ...config, ...maps },
    }
    project.updatedAt = new Date().toISOString()
    void this.pushSync(projectId)
    return { projectId, applied, errors, maps }
  }

  listFonts() {
    return {
      textFonts: [
        { id: 'pingfang', label: '苹方' },
        { id: 'yahei', label: '微软雅黑' },
        { id: 'heiti', label: '黑体' },
        { id: 'song', label: '宋体' },
        { id: 'kai', label: '楷体' },
      ],
      codeFonts: [
        { id: 'jetbrains-mono', label: 'JetBrains Mono' },
        { id: 'ibm-plex-mono', label: 'IBM Plex Mono' },
        { id: 'fira-code', label: 'Fira Code' },
        { id: 'menlo', label: 'Menlo' },
      ],
    }
  }

  listHighlightStyles() {
    return { styles: HIGHLIGHT_STYLES, aspectRatioHints: ASPECT_RATIO_HINTS }
  }

  bridgeStatus() {
    return {
      connected: this.bridges.size > 0,
      clients: this.bridges.size,
      host: this.host,
      port: this.port,
      hint:
        this.bridges.size > 0
          ? '浏览器通道已连接'
          : '请先在本机运行 npm run dev，并用浏览器打开 Era（localhost）',
    }
  }

  registerBridge(socket: WebSocket) {
    this.bridges.add(socket)
    socket.on('close', () => {
      this.bridges.delete(socket)
    })
    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(String(raw)) as BridgeResponse
        const pending = this.pending.get(message.id)
        if (!pending) return
        clearTimeout(pending.timer)
        this.pending.delete(message.id)
        pending.resolve(message)
      } catch {
        // ignore malformed
      }
    })
  }

  async previewLayout(projectId: string) {
    this.requireProject(projectId)
    const response = await this.callBridge({
      type: 'preview_layout',
      projectId,
    })
    if (!response.ok) throw new Error(response.error ?? 'preview_layout 失败')
    return response.data
  }

  async exportImages(projectId: string, pages?: number[], outDir?: string) {
    this.requireProject(projectId)
    const response = await this.callBridge({
      type: 'export_images',
      projectId,
      payload: { pages },
    })
    if (!response.ok) throw new Error(response.error ?? 'export_images 失败')

    const images = (response.data?.images as { name: string; base64: string }[]) ?? []
    const targetDir = path.resolve(outDir ?? path.join(this.outputDir, projectId))
    await fs.mkdir(targetDir, { recursive: true })
    const paths: string[] = []
    for (const image of images) {
      const filePath = path.join(targetDir, image.name)
      await fs.writeFile(filePath, Buffer.from(image.base64, 'base64'))
      paths.push(filePath)
    }
    return { projectId, outDir: targetDir, paths, count: paths.length }
  }

  async pushSync(projectId: string) {
    if (!this.bridges.size) return
    try {
      await this.callBridge({ type: 'sync_project', projectId }, 8_000)
    } catch {
      // 浏览器未就绪时忽略，下次命令会再同步
    }
  }

  private requireProject(projectId: string) {
    const project = this.projects.get(projectId)
    if (!project) throw new Error(`工程不存在: ${projectId}`)
    return project
  }

  private projectSummary(project: StoredProject) {
    const document = project.snapshot.document as {
      blocks: { id: string; kind: string; text?: string }[]
    }
    return {
      projectId: project.id,
      updatedAt: project.updatedAt,
      meta: project.snapshot.meta,
      blockCount: document.blocks.length,
      blocks: summarizeContentBlocks(document),
      config: project.snapshot.config,
      bridgeConnected: this.bridges.size > 0,
    }
  }

  private callBridge(
    partial: Omit<BridgeCommand, 'id'> & { payload?: Record<string, unknown> },
    timeoutMs = 120_000,
  ) {
    if (!this.bridges.size) {
      return Promise.reject(
        new Error('浏览器通道未连接：请本机 npm run dev 打开 Era（localhost），并确认 Agent 指示灯已亮'),
      )
    }

    const project = this.requireProject(partial.projectId)
    const command: BridgeCommand = {
      id: randomUUID(),
      type: partial.type,
      projectId: partial.projectId,
      payload: {
        snapshot: project.snapshot,
        ...(partial.payload ?? {}),
      },
    }

    return new Promise<BridgeResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(command.id)
        reject(new Error(`浏览器响应超时: ${partial.type}`))
      }, timeoutMs)
      this.pending.set(command.id, { resolve, reject, timer })

      const payload = JSON.stringify(command)
      for (const socket of this.bridges) {
        if (socket.readyState === socket.OPEN) {
          socket.send(payload)
        }
      }
    })
  }
}

export const runtime = new EraAgentRuntime()
