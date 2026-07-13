import type {
  GraphicAspectRatio,
  GraphicTextConfig,
  GraphicTextPage,
  MarkdownBlock,
  MarkdownBlockType,
} from './types'
import { stripHighlightMarkers } from './inlineHighlight'

export const GRAPHIC_DISPLAY_BASE_WIDTH = 360

const REFERENCE_WIDTH = 1080
const REFERENCE_HEIGHT = 1440

export interface GraphicLayout {
  pageWidth: number
  pageHeight: number
  exportScale: number
  safeX: number
  safeTop: number
  safeBottom: number
  contentBottom: number
  footerTop: number
  footerHeight: number
  footerMarginBottom: number
  topBarY: number
  topBarHeight: number
  percent: {
    safeX: number
    safeTop: number
    contentBottom: number
    footerBottom: number
    footerHeight: number
    topBarTop: number
    topBarHeight: number
  }
  aspectRatio: { width: number; height: number }
}

function parseAspectRatio(ratio: GraphicAspectRatio) {
  const [width, height] = ratio.split(':').map(Number)
  return { width, height }
}

export function getGraphicLayout(
  config: Pick<GraphicTextConfig, 'aspectRatio'>,
): GraphicLayout {
  const aspect = parseAspectRatio(config.aspectRatio)
  const pageWidth = REFERENCE_WIDTH
  const pageHeight = Math.round((pageWidth * aspect.height) / aspect.width)
  const heightScale = pageHeight / REFERENCE_HEIGHT

  const safeX = 96
  const topBarY = Math.round(60 * heightScale)
  const topBarHeight = Math.round(86 * heightScale)
  const footerHeight = Math.round(72 * heightScale)
  const footerMarginBottom = Math.round(60 * heightScale)
  const contentGapAboveFooter = Math.round(6 * heightScale)
  const contentPaddingBelowTop = Math.round(20 * heightScale)

  const footerTop = pageHeight - footerMarginBottom - footerHeight
  const safeTop = topBarY + topBarHeight + contentPaddingBelowTop
  const contentBottom = footerTop - contentGapAboveFooter
  const safeBottom = pageHeight - contentBottom

  return {
    pageWidth,
    pageHeight,
    exportScale: pageWidth / GRAPHIC_DISPLAY_BASE_WIDTH,
    safeX,
    safeTop,
    safeBottom,
    contentBottom,
    footerTop,
    footerHeight,
    footerMarginBottom,
    topBarY,
    topBarHeight,
    percent: {
      safeX: (safeX / pageWidth) * 100,
      safeTop: (safeTop / pageHeight) * 100,
      contentBottom: (safeBottom / pageHeight) * 100,
      footerBottom: (footerMarginBottom / pageHeight) * 100,
      footerHeight: (footerHeight / pageHeight) * 100,
      topBarTop: (topBarY / pageHeight) * 100,
      topBarHeight: (topBarHeight / pageHeight) * 100,
    },
    aspectRatio: aspect,
  }
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

function blockFontSize(block: MarkdownBlock, config: GraphicTextConfig, exportScale: number) {
  if (block.type === 'title') return config.titleFontSize * exportScale
  if (block.type === 'heading') {
    return Math.round(config.titleFontSize * 0.72 * exportScale)
  }
  return config.bodyFontSize * exportScale
}

function blockLineHeight(block: MarkdownBlock, config: GraphicTextConfig, exportScale: number) {
  const size = blockFontSize(block, config, exportScale)
  if (block.type === 'title') return size * 1.2
  if (block.type === 'heading') return size * 1.32
  return size * 1.48
}

function blockSpacing(block: MarkdownBlock, config: GraphicTextConfig, exportScale: number) {
  const size = blockFontSize(block, config, exportScale)
  const flexGap = Math.round(size * 0.18)
  if (block.type === 'title') return size * 0.28 + flexGap
  if (block.type === 'heading') return size * 0.2 + flexGap
  return size * 0.08 + flexGap
}

function measurePlainText(text: string) {
  return stripHighlightMarkers(text)
}

function estimateBlockHeight(
  block: MarkdownBlock,
  config: GraphicTextConfig,
  layout: GraphicLayout,
) {
  const size = blockFontSize(block, config, layout.exportScale)
  const plainText = measurePlainText(block.text)
  const availableWidth = layout.pageWidth - layout.safeX * 2 - (block.type === 'quote' ? 42 : 0)
  const prefixWidth = block.type === 'list' ? size * 1.35 : 0
  const approximateCharacterWidth = size * (block.type === 'title' || block.type === 'heading' ? 0.95 : 1)
  const charsPerLine = Math.max(
    4,
    Math.floor((availableWidth - prefixWidth) / approximateCharacterWidth),
  )
  const lines = Math.max(1, Math.ceil([...plainText].length / charsPerLine))
  return lines * blockLineHeight(block, config, layout.exportScale) + blockSpacing(block, config, layout.exportScale)
}

function splitOversizedBlock(
  block: MarkdownBlock,
  config: GraphicTextConfig,
  layout: GraphicLayout,
  maxHeight: number,
) {
  const size = blockFontSize(block, config, layout.exportScale)
  const plainText = measurePlainText(block.text)
  const availableWidth = layout.pageWidth - layout.safeX * 2
  const charsPerLine = Math.max(4, Math.floor(availableWidth / (size * 0.98)))
  const maxLines = Math.max(
    1,
    Math.floor((maxHeight - size * 0.55) / blockLineHeight(block, config, layout.exportScale)),
  )
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
  const layout = getGraphicLayout(config)
  const availableHeight = layout.contentBottom - layout.safeTop
  const sourceBlocks = parseMarkdown(markdown)
  const blocks = sourceBlocks.flatMap((block) => {
    if (estimateBlockHeight(block, config, layout) <= availableHeight) return block
    return splitOversizedBlock(block, config, layout, availableHeight)
  })

  if (!blocks.length) {
    return [{ index: 0, blocks: [] }]
  }

  const pages: GraphicTextPage[] = []
  let current: MarkdownBlock[] = []
  let usedHeight = 0

  for (const block of blocks) {
    const height = estimateBlockHeight(block, config, layout)
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
