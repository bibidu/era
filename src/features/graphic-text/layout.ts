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

interface LayoutLine {
  id: string
  type: MarkdownBlockType
  text: string
  lineHeight: number
  spacingAfter: number
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
  return { id: `${index}-${type}`, type, text, isBlockEnd: true }
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

function wrapPlainTextLines(text: string, charsPerLine: number) {
  const chars = [...text]
  if (!chars.length) return ['']

  const lines: string[] = []
  let current = ''

  for (const char of chars) {
    if (current.length >= charsPerLine) {
      lines.push(current)
      current = char
    } else {
      current += char
    }
  }

  if (current) lines.push(current)
  return lines
}

function blockToLayoutLines(
  block: MarkdownBlock,
  config: GraphicTextConfig,
  layout: GraphicLayout,
): LayoutLine[] {
  const plainText = stripHighlightMarkers(block.text)
  const size = blockFontSize(block, config, layout.exportScale)
  const availableWidth = layout.pageWidth - layout.safeX * 2 - (block.type === 'quote' ? 42 : 0)
  const prefixWidth = block.type === 'list' ? size * 1.35 : 0
  const approximateCharacterWidth = size * (block.type === 'title' || block.type === 'heading' ? 0.95 : 1)
  const charsPerLine = Math.max(
    4,
    Math.floor((availableWidth - prefixWidth) / approximateCharacterWidth),
  )
  const lineHeight = blockLineHeight(block, config, layout.exportScale)
  const spacingAfter = blockSpacing(block, config, layout.exportScale)
  const wrappedLines = wrapPlainTextLines(plainText, charsPerLine)

  return wrappedLines.map((lineText, index) => ({
    id: `${block.id}-l${index}`,
    type: index === 0 ? block.type : 'paragraph',
    text: wrappedLines.length === 1 ? block.text : lineText,
    lineHeight,
    spacingAfter: index === wrappedLines.length - 1 ? spacingAfter : 0,
  }))
}

function layoutLinesToBlocks(lines: LayoutLine[]): MarkdownBlock[] {
  return lines.map((line) => ({
    id: line.id,
    type: line.type,
    text: line.text,
    isBlockEnd: line.spacingAfter > 0,
  }))
}

export function paginateMarkdown(markdown: string, config: GraphicTextConfig): GraphicTextPage[] {
  const layout = getGraphicLayout(config)
  const availableHeight = layout.contentBottom - layout.safeTop
  const sourceBlocks = parseMarkdown(markdown)
  const allLines = sourceBlocks.flatMap((block) => blockToLayoutLines(block, config, layout))

  if (!allLines.length) {
    return [{ index: 0, blocks: [] }]
  }

  const pages: GraphicTextPage[] = []
  let currentLines: LayoutLine[] = []
  let usedHeight = 0

  for (const line of allLines) {
    const lineTotal = line.lineHeight + line.spacingAfter
    if (currentLines.length > 0 && usedHeight + lineTotal > availableHeight) {
      pages.push({ index: pages.length, blocks: layoutLinesToBlocks(currentLines) })
      currentLines = []
      usedHeight = 0
    }

    currentLines.push(line)
    usedHeight += lineTotal
  }

  if (currentLines.length) {
    pages.push({ index: pages.length, blocks: layoutLinesToBlocks(currentLines) })
  }

  return pages
}
