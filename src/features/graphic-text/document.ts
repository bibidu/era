import { parseMarkdown } from './layout'
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
    case 'code':
      return `\`\`\`\n${block.text}\n\`\`\``
    case 'list':
      return `- ${block.text}`
    default:
      return block.text
  }
}

export function splitMarkdownToContentBlocks(markdown: string): MarkdownContentBlock[] {
  const text = markdown.trim()
  if (!text) return []
  return parseMarkdown(text).map((block) => createMarkdownContentBlock(markdownFromParsedBlock(block)))
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

    const parsed = parseMarkdown(block.text)
    if (parsed.length <= 1) {
      blocks.push(block)
      continue
    }

    for (const mdBlock of parsed) {
      blocks.push(createMarkdownContentBlock(markdownFromParsedBlock(mdBlock)))
    }
  }

  return { ...document, blocks }
}

export function createDefaultDocument(): GraphicDocument {
  return createDocumentFromMarkdown(DEFAULT_MARKDOWN)
}

export function createBlockId() {
  return crypto.randomUUID()
}

export function createAssetId() {
  return crypto.randomUUID()
}

export function getDocumentMarkdown(document: GraphicDocument): string {
  return document.blocks
    .filter((block): block is MarkdownContentBlock => block.kind === 'markdown')
    .map((block) => block.text)
    .join('\n\n')
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

export function describeContentBlock(
  block: ContentBlock,
  assets: Record<string, GraphicAsset>,
): { label: string; detail: string } {
  if (block.kind === 'image') {
    const asset = assets[block.assetId]
    return {
      label: asset?.name?.trim() || '图片',
      detail: block.fit === 'contain' ? '图片 · 原始比例' : '图片 · 撑满宽度',
    }
  }

  const parsed = parseMarkdown(block.text)
  if (!parsed.length) return { label: '空文字块', detail: '正文' }
  const first = parsed[0]
  const plain = first.text.trim() || '文字块'
  const typeLabel =
    first.type === 'title'
      ? '一级标题'
      : first.type === 'heading'
        ? '二级标题'
        : '正文'
  return {
    label: plain.slice(0, 28) + (plain.length > 28 ? '…' : ''),
    detail: typeLabel,
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

export function createMarkdownContentBlock(text = ''): MarkdownContentBlock {
  return {
    id: createBlockId(),
    kind: 'markdown',
    text,
  }
}
