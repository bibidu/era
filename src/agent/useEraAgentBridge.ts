import { useEffect, useRef, useState } from 'react'
import {
  createDocumentFromMarkdown,
  getDocumentMarkdown,
  normalizeDocument,
  type GraphicDocument,
} from '../features/graphic-text/document'
import { exportGraphicPages } from '../features/graphic-text/exportGraphicPages'
import { paginateDocument, parseMarkdown } from '../features/graphic-text/layout'
import { parseScopedMarkdown } from '../features/graphic-text/document'
import type { GraphicTextConfig } from '../features/graphic-text/types'
import { DEFAULT_GRADIENT_VARIANT } from '../features/graphic-text/pageGradientOverlay'
import { inspectGraphicLayout } from './layoutInspect'
import {
  ERA_AGENT_DEFAULT_HOST,
  ERA_AGENT_DEFAULT_PORT,
  type BridgeCommand,
  type BridgeResponse,
  type EraProjectSnapshot,
} from './protocol'

export interface GraphicAgentController {
  getDocument: () => GraphicDocument
  getConfig: () => GraphicTextConfig
  applySnapshot: (snapshot: EraProjectSnapshot) => void
}

function isLocalHost() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function bridgeUrl() {
  const custom = import.meta.env.VITE_ERA_AGENT_WS as string | undefined
  if (custom) return custom
  const host = import.meta.env.VITE_ERA_AGENT_HOST ?? ERA_AGENT_DEFAULT_HOST
  const port = import.meta.env.VITE_ERA_AGENT_PORT ?? ERA_AGENT_DEFAULT_PORT
  return `ws://${host}:${port}/bridge`
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(blob)
  })
}

async function handleBridgeCommand(
  command: BridgeCommand,
  controller: GraphicAgentController,
): Promise<BridgeResponse> {
  try {
    if (command.type === 'ping') {
      return { id: command.id, ok: true, data: { pong: true } }
    }

    const snapshot = command.payload?.snapshot as EraProjectSnapshot | undefined
    if (snapshot) {
      controller.applySnapshot(snapshot)
      // 等待一帧让 React 提交状态
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    }

    if (command.type === 'sync_project') {
      return { id: command.id, ok: true, data: { synced: true } }
    }

    const document = controller.getDocument()
    const config = controller.getConfig()

    if (command.type === 'preview_layout') {
      const inspection = inspectGraphicLayout(document, config)
      const pages = paginateDocument(document, config)
      const blocks = document.blocks.flatMap((block) => {
        if (block.kind !== 'markdown') return []
        return parseScopedMarkdown(block.id, block.text).map((md) => ({
          id: md.id,
          type: md.type,
          text: md.text,
        }))
      })
      return {
        id: command.id,
        ok: true,
        data: {
          pageCount: inspection.pageCount,
          warnings: inspection.warnings,
          pages: pages.map((page) => ({
            index: page.index,
            lineCount: page.blocks.length,
          })),
          blocks,
          aspectRatio: config.aspectRatio,
          aspectHint: config.aspectRatio === '3:4' ? '小红书风格' : '抖音风格',
          pageOverlay: config.pageOverlay,
        },
      }
    }

    if (command.type === 'export_images') {
      const pages = paginateDocument(document, config)
      const selectedIndexes = Array.isArray(command.payload?.pages)
        ? (command.payload.pages as number[])
        : null
      const selected = selectedIndexes
        ? selectedIndexes.map((index) => pages[index]).filter(Boolean)
        : pages
      const markdown = getDocumentMarkdown(document)
      const blobs = await exportGraphicPages(selected, config, markdown)
      const images = []
      for (let index = 0; index < blobs.length; index += 1) {
        images.push({
          name: `graphic-page-${String(index + 1).padStart(2, '0')}.png`,
          base64: await blobToBase64(blobs[index]),
        })
      }
      return {
        id: command.id,
        ok: true,
        data: { count: images.length, images },
      }
    }

    return { id: command.id, ok: false, error: `未知命令: ${command.type}` }
  } catch (error) {
    return {
      id: command.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 仅在 localhost 自动连接 Agent WebSocket。
 * GitHub Pages / 非本机环境不会发起连接，不影响正常前端使用。
 */
export function useEraAgentBridge(controller: GraphicAgentController | null) {
  const [connected, setConnected] = useState(false)
  const controllerRef = useRef(controller)
  controllerRef.current = controller

  useEffect(() => {
    if (!isLocalHost() || !controller) return

    let closed = false
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (closed) return
      const ws = new WebSocket(bridgeUrl())
      socket = ws

      ws.onopen = () => {
        if (closed) return
        setConnected(true)
      }

      ws.onclose = () => {
        setConnected(false)
        if (closed) return
        reconnectTimer = setTimeout(connect, 2000)
      }

      ws.onerror = () => {
        // 本地未启动 agent 时属正常情况，静默重试
        ws.close()
      }

      ws.onmessage = (event) => {
        const current = controllerRef.current
        if (!current) return
        let command: BridgeCommand
        try {
          command = JSON.parse(String(event.data)) as BridgeCommand
        } catch {
          return
        }
        if (!command?.id || !command?.type) return
        if (command.id === 'welcome') return

        void handleBridgeCommand(command, current).then((response) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(response))
          }
        })
      }
    }

    connect()

    return () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
      setConnected(false)
    }
  }, [controller])

  return { connected, enabled: isLocalHost() }
}

export function snapshotFromState(
  document: GraphicDocument,
  config: GraphicTextConfig,
  meta?: EraProjectSnapshot['meta'],
): EraProjectSnapshot {
  return {
    version: 1,
    document,
    config,
    meta,
  }
}

export function documentFromSnapshot(snapshot: EraProjectSnapshot): GraphicDocument {
  const raw = snapshot.document as GraphicDocument
  if (raw && Array.isArray(raw.blocks)) {
    return normalizeDocument(raw)
  }
  return normalizeDocument(createDocumentFromMarkdown(''))
}

export function configFromSnapshot(
  snapshot: EraProjectSnapshot,
  fallback: GraphicTextConfig,
): GraphicTextConfig {
  const raw = snapshot.config as Partial<GraphicTextConfig> | undefined
  if (!raw) return fallback
  return {
    ...fallback,
    ...raw,
    gradientVariant: raw.gradientVariant ?? fallback.gradientVariant ?? DEFAULT_GRADIENT_VARIANT,
    underlineHighlightColors: raw.underlineHighlightColors ?? {},
    handUnderlineHighlightColors: raw.handUnderlineHighlightColors ?? {},
    brushHighlightColors: raw.brushHighlightColors ?? {},
    quoteHighlightColors: raw.quoteHighlightColors ?? {},
    circleHighlightColors: raw.circleHighlightColors ?? {},
  }
}

/** 供调试：从 markdown 快速看解析块 */
export function debugParseMarkdown(markdown: string) {
  return parseMarkdown(markdown)
}
