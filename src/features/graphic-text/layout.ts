import type {
  GraphicTextConfig,
  GraphicTextPage,
  MarkdownBlock,
  MarkdownBlockType,
} from './types'
import { stripHighlightMarkers } from './inlineHighlight'

const PAGE_WIDTH = 1080
const PAGE_HEIGHT = 1440
const SAFE_X = 96
const TOP_BAR_Y = 60
const TOP_BAR_HEIGHT = 86
const FOOTER_HEIGHT = 72
const FOOTER_MARGIN_BOTTOM = 60
const CONTENT_GAP_ABOVE_FOOTER = 12
const CONTENT_PADDING_BELOW_TOP = 20

const FOOTER_TOP = PAGE_HEIGHT - FOOTER_MARGIN_BOTTOM - FOOTER_HEIGHT
const SAFE_TOP = TOP_BAR_Y + TOP_BAR_HEIGHT + CONTENT_PADDING_BELOW_TOP
const CONTENT_BOTTOM = FOOTER_TOP - CONTENT_GAP_ABOVE_FOOTER
const SAFE_BOTTOM = PAGE_HEIGHT - CONTENT_BOTTOM

export const GRAPHIC_DISPLAY_BASE_WIDTH = 360
export const GRAPHIC_EXPORT_SCALE = PAGE_WIDTH / GRAPHIC_DISPLAY_BASE_WIDTH

export const GRAPHIC_PAGE_SIZE = {
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT,
  safeX: SAFE_X,
  safeTop: SAFE_TOP,
  safeBottom: SAFE_BOTTOM,
  footerTop: FOOTER_TOP,
  footerHeight: FOOTER_HEIGHT,
  footerMarginBottom: FOOTER_MARGIN_BOTTOM,
  contentBottom: CONTENT_BOTTOM,
}

export const GRAPHIC_LAYOUT_PERCENT = {
  safeX: (SAFE_X / PAGE_WIDTH) * 100,
  safeTop: (SAFE_TOP / PAGE_HEIGHT) * 100,
  contentBottom: (SAFE_BOTTOM / PAGE_HEIGHT) * 100,
  footerBottom: (FOOTER_MARGIN_BOTTOM / PAGE_HEIGHT) * 100,
  footerHeight: (FOOTER_HEIGHT / PAGE_HEIGHT) * 100,
  topBarTop: (TOP_BAR_Y / PAGE_HEIGHT) * 100,
  topBarHeight: (TOP_BAR_HEIGHT / PAGE_HEIGHT) * 100,
}

function createBlock(type: MarkdownBlockType, text: string, index: number): MarkdownBlock {
  return { id: `${index}-${type}`, type, text }
}

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim()
    if (text) blocks.push(createBlock('paragraph', text, blocks.length))
    paragraph = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      continue
    }

    if (line.startsWith('# ')) {
      flushParagraph()
      blocks.push(createBlock('title', line.slice(2).trim(), blocks.length))
    } else if (/^#{2,6}\s/.test(line)) {
      flushParagraph()
      blocks.push(createBlock('heading', line.replace(/^#{2,6}\s+/, ''), blocks.length))
    } else if (/^[-*+]\s/.test(line)) {
      flushParagraph()
      blocks.push(createBlock('list', line.replace(/^[-*+]\s+/, ''), blocks.length))
    } else if (/^\d+\.\s/.test(line)) {
      flushParagraph()
      blocks.push(createBlock('list', line.replace(/^\d+\.\s+/, ''), blocks.length))
    } else if (line.startsWith('> ')) {
      flushParagraph()
      blocks.push(createBlock('quote', line.slice(2).trim(), blocks.length))
    } else {
      paragraph.push(line)
    }
  }

  flushParagraph()
  return blocks
}

function blockFontSize(block: MarkdownBlock, config: GraphicTextConfig) {
  if (block.type === 'title') return config.titleFontSize * GRAPHIC_EXPORT_SCALE
  if (block.type === 'heading') {
    return Math.round(config.titleFontSize * 0.72 * GRAPHIC_EXPORT_SCALE)
  }
  return config.bodyFontSize * GRAPHIC_EXPORT_SCALE
}

function blockLineHeight(block: MarkdownBlock, config: GraphicTextConfig) {
  const size = blockFontSize(block, config)
  return size * (block.type === 'title' ? 1.22 : 1.55)
}

function measurePlainText(text: string) {
  return stripHighlightMarkers(text)
}

function estimateBlockHeight(block: MarkdownBlock, config: GraphicTextConfig) {
  const size = blockFontSize(block, config)
  const plainText = measurePlainText(block.text)
  const availableWidth = PAGE_WIDTH - SAFE_X * 2 - (block.type === 'quote' ? 42 : 0)
  const prefixWidth = block.type === 'list' ? size * 1.35 : 0
  const approximateCharacterWidth = size * 0.98
  const charsPerLine = Math.max(
    4,
    Math.floor((availableWidth - prefixWidth) / approximateCharacterWidth),
  )
  const lines = Math.max(1, Math.ceil([...plainText].length / charsPerLine))
  const spacing =
    block.type === 'title' ? size * 0.8 : block.type === 'heading' ? size * 0.65 : size * 0.55
  return lines * blockLineHeight(block, config) + spacing
}

function splitOversizedBlock(block: MarkdownBlock, config: GraphicTextConfig, maxHeight: number) {
  const size = blockFontSize(block, config)
  const plainText = measurePlainText(block.text)
  const availableWidth = PAGE_WIDTH - SAFE_X * 2
  const charsPerLine = Math.max(4, Math.floor(availableWidth / (size * 0.98)))
  const maxLines = Math.max(1, Math.floor((maxHeight - size * 0.55) / blockLineHeight(block, config)))
  const maxChars = Math.max(charsPerLine, charsPerLine * maxLines)
  const chars = [...plainText]
  const parts: MarkdownBlock[] = []

  for (let start = 0; start < chars.length; start += maxChars) {
    parts.push({
      ...block,
      id: `${block.id}-${parts.length}`,
      text: chars.slice(start, start + maxChars).join(''),
      type: parts.length === 0 ? block.type : 'paragraph',
    })
  }

  return parts
}

export function paginateMarkdown(markdown: string, config: GraphicTextConfig): GraphicTextPage[] {
  const availableHeight = CONTENT_BOTTOM - SAFE_TOP
  const sourceBlocks = parseMarkdown(markdown)
  const blocks = sourceBlocks.flatMap((block) => {
    if (estimateBlockHeight(block, config) <= availableHeight) return block
    return splitOversizedBlock(block, config, availableHeight)
  })

  if (!blocks.length) {
    return [{ index: 0, blocks: [] }]
  }

  const pages: GraphicTextPage[] = []
  let current: MarkdownBlock[] = []
  let usedHeight = 0

  for (const block of blocks) {
    const height = estimateBlockHeight(block, config)
    if (current.length > 0 && usedHeight + height > availableHeight) {
      pages.push({ index: pages.length, blocks: current })
      current = []
      usedHeight = 0
    }
    current.push(block)
    usedHeight += height
  }

  if (current.length) pages.push({ index: pages.length, blocks: current })
  return pages
}
