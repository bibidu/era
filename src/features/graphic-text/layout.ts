import type {
  GraphicAspectRatio,
  GraphicTextConfig,
  GraphicTextPage,
  MarkdownBlock,
  MarkdownBlockType,
} from './types'
import { stripHighlightMarkers } from './inlineHighlight'
import { HEADING_FONT_SCALE } from './graphicPreviewLayout'
import { wrapPlainTextLines } from './textWrap'

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
  bottomPadding: number
  topBarY: number
  topBarHeight: number
  percent: {
    safeX: number
    safeTop: number
    contentBottom: number
    topBarTop: number
    topBarHeight: number
  }
  aspectRatio: { width: number; height: number }
}

interface LayoutLine {
  id: string
  type: MarkdownBlockType
  styleType: MarkdownBlockType
  text: string
  lineHeight: number
  spacingBefore: number
  spacingAfter: number
  sourceBlockId: string
  charOffset: number
}

function parseAspectRatio(ratio: GraphicAspectRatio) {
  const [width, height] = ratio.split(':').map(Number)
  return { width, height }
}

function resolveStyleType(block: Pick<MarkdownBlock, 'type' | 'styleType'>): MarkdownBlockType {
  return block.styleType ?? block.type
}

export function getGraphicLayout(
  config: Pick<GraphicTextConfig, 'aspectRatio'>,
): GraphicLayout {
  const aspect = parseAspectRatio(config.aspectRatio)
  const pageWidth = REFERENCE_WIDTH
  const pageHeight = Math.round((pageWidth * aspect.height) / aspect.width)
  const heightScale = pageHeight / REFERENCE_HEIGHT

  const safeX = 96
  const topBarY = Math.round(84 * heightScale)
  const topBarHeight = Math.round(44 * heightScale)
  const contentPaddingBelowTop = Math.round(40 * heightScale)
  const bottomPadding = Math.round(56 * heightScale)

  const safeTop = topBarY + topBarHeight + contentPaddingBelowTop
  const contentBottom = pageHeight - bottomPadding
  const safeBottom = pageHeight - contentBottom

  return {
    pageWidth,
    pageHeight,
    exportScale: pageWidth / GRAPHIC_DISPLAY_BASE_WIDTH,
    safeX,
    safeTop,
    safeBottom,
    contentBottom,
    bottomPadding,
    topBarY,
    topBarHeight,
    percent: {
      safeX: (safeX / pageWidth) * 100,
      safeTop: (safeTop / pageHeight) * 100,
      contentBottom: (safeBottom / pageHeight) * 100,
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
      blocks.push(createBlock('paragraph', line.slice(2).trim(), blocks.length))
    } else {
      paragraph.push(line)
    }
  }

  flushParagraph()
  return blocks
}

function blockFontSize(block: MarkdownBlock, config: GraphicTextConfig, exportScale: number) {
  const type = resolveStyleType(block)
  if (type === 'title') return config.titleFontSize * exportScale
  if (type === 'heading') {
    return Math.round(config.titleFontSize * HEADING_FONT_SCALE * exportScale)
  }
  return config.bodyFontSize * exportScale
}

function blockLineHeight(block: MarkdownBlock, config: GraphicTextConfig, exportScale: number) {
  const type = resolveStyleType(block)
  const size = blockFontSize(block, config, exportScale)
  if (type === 'title' || type === 'heading') return size * config.titleLineHeight
  return size * config.bodyLineHeight
}

function blockGap(layout: GraphicLayout) {
  return layout.pageWidth * 0.011
}

function blockSpacingAfter(
  block: MarkdownBlock,
  config: GraphicTextConfig,
  exportScale: number,
  layout: GraphicLayout,
  isLastLine: boolean,
) {
  if (!isLastLine) return 0

  const type = resolveStyleType(block)
  const size = blockFontSize(block, config, exportScale)
  const flexGap = Math.round(size * 0.18)

  if (type === 'title') return size * 0.28 + flexGap + blockGap(layout)
  if (type === 'heading') return size * config.headingMarginBottom + flexGap + blockGap(layout)
  return size * 0.08 + flexGap + blockGap(layout)
}

function blockSpacingBefore(
  block: MarkdownBlock,
  config: GraphicTextConfig,
  exportScale: number,
  isFirstLine: boolean,
) {
  if (!isFirstLine) return 0

  const type = resolveStyleType(block)
  const size = blockFontSize(block, config, exportScale)
  if (type === 'heading') return size * config.headingMarginTop
  return 0
}

function blockToLayoutLines(
  block: MarkdownBlock,
  config: GraphicTextConfig,
  layout: GraphicLayout,
): LayoutLine[] {
  const styleType = resolveStyleType(block)
  const plainText = stripHighlightMarkers(block.text)
  const size = blockFontSize(block, config, layout.exportScale)
  const availableWidth = layout.pageWidth - layout.safeX * 2 - (block.type === 'list' ? size * 1.35 : 0)
  const approximateCharacterWidth =
    size * (styleType === 'title' || styleType === 'heading' ? 0.95 : 1)
  const charsPerLine = Math.max(
    4,
    Math.floor(availableWidth / approximateCharacterWidth),
  )
  const lineHeight = blockLineHeight(block, config, layout.exportScale)
  const wrappedLines = wrapPlainTextLines(plainText, charsPerLine)

  let charOffset = 0
  return wrappedLines.map((lineText, index) => {
    const line: LayoutLine = {
      id: `${block.id}-l${index}`,
      type: index === 0 ? block.type : 'paragraph',
      styleType,
      text: wrappedLines.length === 1 ? block.text : lineText,
      lineHeight,
      spacingBefore: blockSpacingBefore(block, config, layout.exportScale, index === 0),
      spacingAfter: blockSpacingAfter(
        block,
        config,
        layout.exportScale,
        layout,
        index === wrappedLines.length - 1,
      ),
      sourceBlockId: block.id,
      charOffset,
    }
    charOffset += [...lineText].length
    return line
  })
}

function layoutLinesToBlocks(lines: LayoutLine[]): MarkdownBlock[] {
  return lines.map((line) => ({
    id: line.id,
    type: line.type,
    styleType: line.styleType,
    text: line.text,
    isBlockEnd: line.spacingAfter > 0,
    sourceBlockId: line.sourceBlockId,
    charOffset: line.charOffset,
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
    const lineTotal = line.spacingBefore + line.lineHeight + line.spacingAfter

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
