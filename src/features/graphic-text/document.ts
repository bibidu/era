import { createId } from '../../utils/id'
import { parseMarkdown } from './layout'
import { stripHighlightMarkers } from './inlineHighlight'
import {
  ERA_PAGE_BREAK_MARKER,
  isPageBreakMarker,
  stripPageBreakMarkerLines,
} from './pageBreak'
import { DEFAULT_MARKDOWN, type MarkdownBlock } from './types'

export type ImageFit = 'width' | 'contain'

export interface GraphicAsset {
  id: string
  url: string
  width: number
  height: number
  name?: string
}

export interface MarkdownContentBlock {
  id: string
  kind: 'markdown'
  text: string
  pageBreakBefore?: boolean
}

export interface ImageContentBlock {
  id: string
  kind: 'image'
  assetId: string
  fit: ImageFit
  marginTop: number
  marginBottom: number
}

export type ContentBlock = MarkdownContentBlock | ImageContentBlock

export interface GraphicDocument {
  blocks: ContentBlock[]
  assets: Record<string, GraphicAsset>
}

export const DEFAULT_IMAGE_MARGIN = 0.32

export function createEmptyDocument(): GraphicDocument {
  return { blocks: [], assets: {} }
}

function markdownFromParsedBlock(block: MarkdownBlock): string {
  switch (block.type) {
    case 'title':
      return `# ${block.text}`
    case 'heading':
      return `## ${block.text}`
    case 'code': {
      const info = block.codeFenceInfo?.trim() ?? ''
      return `\`\`\`${info}\n${block.text}\n\`\`\``
    }
    case 'list':
      return `- ${block.text}`
    case 'image': {
      const size =
        block.imageWidth && block.imageHeight
          ? ` =${block.imageWidth}x${block.imageHeight}`
          : ''
      return `![${block.text ?? ''}](${block.imageUrl ?? ''}${size})`
    }
    default:
      return block.text
  }
}

export function splitMarkdownToContentBlocks(markdown: string): MarkdownContentBlock[] {
  const text = markdown.trim()
  if (!text) return []
  return parseMarkdown(text)
    .filter((block) => !isPageBreakMarker(block.text))
    .map((block) =>
      createMarkdownContentBlock(markdownFromParsedBlock(block), block.pageBreakBefore),
    )
}

function sanitizeMarkdownContentBlock(block: MarkdownContentBlock): MarkdownContentBlock | null {
  if (isPageBreakMarker(block.text)) return null
  const text = stripPageBreakMarkerLines(block.text)
  if (!text) return null
  return text === block.text ? block : { ...block, text }
}

export function createDocumentFromMarkdown(markdown: string): GraphicDocument {
  return {
    blocks: splitMarkdownToContentBlocks(markdown),
    assets: {},
  }
}

export function normalizeDocument(document: GraphicDocument): GraphicDocument {
  const blocks: ContentBlock[] = []

  for (const block of document.blocks) {
    if (block.kind === 'image') {
      blocks.push(block)
      continue
    }

    const sanitized = sanitizeMarkdownContentBlock(block)
    if (!sanitized) continue

    const parsed = parseMarkdown(sanitized.text)
    if (parsed.length <= 1) {
      blocks.push(sanitized)
      continue
    }

    for (const mdBlock of parsed) {
      if (isPageBreakMarker(mdBlock.text)) continue
      blocks.push(
        createMarkdownContentBlock(markdownFromParsedBlock(mdBlock), mdBlock.pageBreakBefore),
      )
    }
  }

  return { ...document, blocks }
}

export function createDefaultDocument(): GraphicDocument {
  return createDocumentFromMarkdown(DEFAULT_MARKDOWN)
}

export function createBlockId() {
  return createId()
}

export function createAssetId() {
  return createId()
}

export function getDocumentMarkdown(document: GraphicDocument): string {
  return document.blocks
    .filter((block): block is MarkdownContentBlock => block.kind === 'markdown')
    .map((block) => stripPageBreakMarkerLines(block.text))
    .filter((text) => text.length > 0)
    .join('\n\n')
}

/** 高亮设置分享用：保留内部分页指令，供前端整段解析 */
export function getDocumentMarkdownForShare(document: GraphicDocument): string {
  return document.blocks
    .filter((block): block is MarkdownContentBlock => block.kind === 'markdown')
    .map((block) => {
      if (isPageBreakMarker(block.text)) return ''
      const body = stripPageBreakMarkerLines(block.text)
      if (!body) return ''
      return block.pageBreakBefore ? `${ERA_PAGE_BREAK_MARKER}\n\n${body}` : body
    })
    .filter((text) => text.length > 0)
    .join('\n\n')
}

export function createHighlightShareDocument(document: GraphicDocument): GraphicDocument {
  const markdown = getDocumentMarkdownForShare(document)
  return {
    blocks: markdown ? [createMarkdownContentBlock(markdown)] : [],
    assets: document.assets ?? {},
  }
}

export function parseScopedMarkdown(scopeId: string, markdown: string) {
  return parseMarkdown(markdown).map((block, index) => {
    const id = `${scopeId}::${index}::${block.type}`
    return {
      ...block,
      id,
      sourceBlockId: id,
    }
  })
}

export function plainTextByScopedBlockId(document: GraphicDocument): Record<string, string> {
  const result: Record<string, string> = {}
  for (const block of document.blocks) {
    if (block.kind !== 'markdown') continue
    if (isPageBreakMarker(block.text)) continue
    for (const md of parseScopedMarkdown(block.id, block.text)) {
      result[md.id] = stripHighlightMarkers(md.text)
    }
  }
  return result
}

export function describeContentBlock(
  block: ContentBlock,
  assets: Record<string, GraphicAsset>,
): { content: string; typeLabel: string } {
  if (block.kind === 'image') {
    const asset = assets[block.assetId]
    const name = asset?.name?.trim() || '图片'
    return { content: name, typeLabel: '图片' }
  }

  const parsed = parseMarkdown(block.text)
  if (!parsed.length) return { content: '空文字块', typeLabel: '正文' }
  const first = parsed[0]
  const typeLabel =
    first.type === 'title'
      ? '一级标题'
      : first.type === 'heading'
        ? '二级标题'
        : first.type === 'code'
          ? '代码块'
          : '正文'
  const previewText =
    first.type === 'code'
      ? first.text.split('\n').join(' ').trim()
      : first.text.trim()
  return {
    content: previewText || '空文字块',
    typeLabel,
  }
}

export function insertContentBlock(
  document: GraphicDocument,
  index: number,
  block: ContentBlock,
): GraphicDocument {
  const blocks = [...document.blocks]
  blocks.splice(index, 0, block)
  return { ...document, blocks }
}

export function updateContentBlock(
  document: GraphicDocument,
  blockId: string,
  updater: (block: ContentBlock) => ContentBlock,
): GraphicDocument {
  return {
    ...document,
    blocks: document.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
  }
}

export function removeContentBlock(document: GraphicDocument, blockId: string): GraphicDocument {
  const removed = document.blocks.find((block) => block.id === blockId)
  const blocks = document.blocks.filter((block) => block.id !== blockId)
  if (!removed || removed.kind !== 'image') {
    return { ...document, blocks }
  }

  const stillUsed = blocks.some(
    (block) => block.kind === 'image' && block.assetId === removed.assetId,
  )
  if (stillUsed) return { ...document, blocks }

  const assets = { ...document.assets }
  delete assets[removed.assetId]
  return { ...document, blocks, assets }
}

export function moveContentBlock(
  document: GraphicDocument,
  blockId: string,
  direction: -1 | 1,
): GraphicDocument {
  const index = document.blocks.findIndex((block) => block.id === blockId)
  if (index < 0) return document
  const target = index + direction
  if (target < 0 || target >= document.blocks.length) return document
  const blocks = [...document.blocks]
  const [item] = blocks.splice(index, 1)
  blocks.splice(target, 0, item)
  return { ...document, blocks }
}

export function addAsset(document: GraphicDocument, asset: GraphicAsset): GraphicDocument {
  return {
    ...document,
    assets: { ...document.assets, [asset.id]: asset },
  }
}

export function removeAsset(document: GraphicDocument, assetId: string): GraphicDocument {
  const blocks = document.blocks.filter(
    (block) => !(block.kind === 'image' && block.assetId === assetId),
  )
  const assets = { ...document.assets }
  delete assets[assetId]
  return { blocks, assets }
}

export function isAssetUsed(document: GraphicDocument, assetId: string) {
  return document.blocks.some((block) => block.kind === 'image' && block.assetId === assetId)
}

export function createImageContentBlock(assetId: string): ImageContentBlock {
  return {
    id: createBlockId(),
    kind: 'image',
    assetId,
    fit: 'width',
    marginTop: DEFAULT_IMAGE_MARGIN,
    marginBottom: DEFAULT_IMAGE_MARGIN,
  }
}

export function createMarkdownContentBlock(
  text = '',
  pageBreakBefore?: boolean,
): MarkdownContentBlock {
  return {
    id: createBlockId(),
    kind: 'markdown',
    text,
    ...(pageBreakBefore ? { pageBreakBefore: true } : {}),
  }
}
