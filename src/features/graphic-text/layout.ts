import type {
  ContentBlock,
  GraphicAsset,
  GraphicDocument,
  ImageContentBlock,
  MarkdownContentBlock,
} from './document'
import { DEFAULT_IMAGE_MARGIN, parseScopedMarkdown } from './document'
import { getFontConfigForStyleType } from './graphicTextFonts'
import { measureImageLayoutSize } from './imageAsset'
import { stripHighlightMarkers } from './inlineHighlight'
import {
  CODE_HORIZONTAL_PADDING_SCALE,
  estimateCodeLineWidth,
  wrapCodeTextLines,
} from './codeBlock'
import { wrapPlainTextLinesByWidth } from './textWrap'
import { ERA_PAGE_BREAK_MARKER, isPageBreakMarker } from './pageBreak'
import { isSeriesLabelPage, SERIES_LABEL_GAP_LINES } from './topBar'
import type {
  GraphicAspectRatio,
  GraphicTextConfig,
  GraphicTextPage,
  MarkdownBlock,
  MarkdownBlockType,
} from './types'

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
  titleSentenceIndex?: number
  imageUrl?: string
  imageWidth?: number
  imageHeight?: number
  pageBreakBefore?: boolean
}

/** 按句末标点切开标题，使第二句可换行并用次级字号。
 * 若含换行或 U+2028（行分隔符），优先按行切开（便于手动控制标题分行，且不留下句号）。 */
export function splitTitleSentences(text: string): string[] {
  const plain = text.trim()
  if (!plain) return ['']
  if (/[\n\u2028]/.test(plain)) {
    const lines = plain.split(/[\n\u2028]/).map((part) => part.trim()).filter(Boolean)
    return lines.length ? lines : [plain]
  }
  const parts = plain.split(/(?<=[？！。!?])/).map((part) => part.trim()).filter(Boolean)
  return parts.length ? parts : [plain]
}

function parseAspectRatio(ratio: GraphicAspectRatio) {
  const [width, height] = ratio.split(':').map(Number)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 3, height: 4 }
  }
  return { width, height }
}

function resolveStyleType(block: Pick<MarkdownBlock, 'type' | 'styleType'>): MarkdownBlockType {
  return block.styleType ?? block.type
}

export function getGraphicLayout(
  config: Pick<GraphicTextConfig, 'aspectRatio'> &
    Partial<Pick<GraphicTextConfig, 'seriesLabel' | 'bodyFontSize' | 'bodyLineHeight'>>,
  options: { pageIndex?: number } = {},
): GraphicLayout {
  const aspect = parseAspectRatio(config.aspectRatio)
  const pageWidth = REFERENCE_WIDTH
  const pageHeight = Math.round((pageWidth * aspect.height) / aspect.width)
  const heightScale = pageHeight / REFERENCE_HEIGHT
  const pageIndex = options.pageIndex ?? 0
  const bodyFontSize = config.bodyFontSize ?? 13
  const bodyLineHeight = config.bodyLineHeight ?? 1.64
  const seriesLabel = config.seriesLabel ?? ''

  const safeX = 96
  const topBarY = Math.round(84 * heightScale)
  const topBarHeight = Math.round(44 * heightScale)
  const defaultPaddingBelowTop = Math.round(40 * heightScale)
  const exportScale = pageWidth / GRAPHIC_DISPLAY_BASE_WIDTH
  // 系列期数页：顶栏红线到下方二级标题约三行正文间距
  // bodyFontSize 与正文一致，按 exportScale（宽基准）换算到页像素，勿用 heightScale
  const seriesPaddingBelowTop = Math.round(
    bodyFontSize * exportScale * bodyLineHeight * SERIES_LABEL_GAP_LINES,
  )
  const contentPaddingBelowTop = isSeriesLabelPage({ seriesLabel }, pageIndex)
    ? Math.max(defaultPaddingBelowTop, seriesPaddingBelowTop)
    : defaultPaddingBelowTop
  const bottomPadding = Math.round(56 * heightScale)

  const safeTop = topBarY + topBarHeight + contentPaddingBelowTop
  const contentBottom = pageHeight - bottomPadding
  const safeBottom = pageHeight - contentBottom

  return {
    pageWidth,
    pageHeight,
    exportScale,
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

/** 匹配整行图片： ![alt](url) ，url 后可带可选尺寸提示 " =宽x高"（原始像素） */
const IMAGE_LINE_RE = /^!\[([^\]]*)\]\((.+)\)$/
const IMAGE_SIZE_HINT_RE = /^(.*?)(?:\s+=(\d+)x(\d+))$/

export function isImageMarkdownLine(line: string): boolean {
  return IMAGE_LINE_RE.test(line.trim())
}

function createImageBlock(line: string, index: number): MarkdownBlock {
  const match = line.trim().match(IMAGE_LINE_RE)
  const alt = match?.[1]?.trim() ?? ''
  const rawUrl = (match?.[2] ?? '').trim()
  const sizeMatch = rawUrl.match(IMAGE_SIZE_HINT_RE)
  const url = (sizeMatch ? sizeMatch[1] : rawUrl).trim()
  const width = sizeMatch ? Number(sizeMatch[2]) : undefined
  const height = sizeMatch ? Number(sizeMatch[3]) : undefined
  return {
    id: `${index}-image`,
    type: 'image',
    text: alt,
    isBlockEnd: true,
    imageUrl: url,
    imageWidth: width && width > 0 ? width : undefined,
    imageHeight: height && height > 0 ? height : undefined,
  }
}

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let codeLines: string[] = []
  let inCodeBlock = false
  let pendingPageBreak = false

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim()
    if (text && !isPageBreakMarker(text)) blocks.push(createBlock('paragraph', text, blocks.length))
    paragraph = []
  }

  const pushBlock = (block: MarkdownBlock) => {
    if (pendingPageBreak) {
      block.pageBreakBefore = true
      pendingPageBreak = false
    }
    blocks.push(block)
  }

  const flushCodeBlock = () => {
    if (!codeLines.length) return
    pushBlock(createBlock('code', codeLines.join('\n'), blocks.length))
    codeLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (inCodeBlock) {
      if (line.startsWith('```')) {
        inCodeBlock = false
        flushCodeBlock()
      } else {
        codeLines.push(rawLine.replace(/\s+$/, ''))
      }
      continue
    }

    if (line.startsWith('```')) {
      flushParagraph()
      inCodeBlock = true
      continue
    }

    if (!line) {
      flushParagraph()
      continue
    }

    if (line === ERA_PAGE_BREAK_MARKER) {
      flushParagraph()
      pendingPageBreak = true
      continue
    }

    if (isImageMarkdownLine(line)) {
      flushParagraph()
      pushBlock(createImageBlock(line, blocks.length))
    } else if (line.startsWith('# ')) {
      flushParagraph()
      pushBlock(createBlock('title', line.slice(2).trim(), blocks.length))
    } else if (/^#{2,6}\s/.test(line)) {
      flushParagraph()
      pushBlock(createBlock('heading', line.replace(/^#{2,6}\s+/, ''), blocks.length))
    } else if (/^[-*+]\s/.test(line)) {
      flushParagraph()
      pushBlock(createBlock('list', line.replace(/^[-*+]\s+/, ''), blocks.length))
    } else if (/^\d+\.\s/.test(line)) {
      flushParagraph()
      pushBlock(createBlock('list', line.replace(/^\d+\.\s+/, ''), blocks.length))
    } else {
      paragraph.push(line)
    }
  }

  flushParagraph()
  if (inCodeBlock) flushCodeBlock()
  return blocks
}

/**
 * 标题分行字号：
 * - 第 1 行用 titleFontSize
 * - 其后默认用 titleSecondaryFontSize（常小于主字号）
 * - 若 secondary > primary（强调行模式）：仅第 2 行用大字号，第 3 行及以后回到 titleFontSize
 */
export function resolveTitleFontSize(
  block: Pick<MarkdownBlock, 'titleSentenceIndex'>,
  config: Pick<GraphicTextConfig, 'titleFontSize' | 'titleSecondaryFontSize'>,
) {
  const index = block.titleSentenceIndex ?? 0
  const primary = config.titleFontSize
  const secondary = config.titleSecondaryFontSize ?? Math.round(primary * 0.72)
  if (index === 0) return primary
  if (secondary > primary) {
    return index === 1 ? secondary : primary
  }
  return secondary
}

function blockFontSize(block: MarkdownBlock, config: GraphicTextConfig, exportScale: number) {
  const type = resolveStyleType(block)
  if (type === 'title') return resolveTitleFontSize(block, config) * exportScale
  if (type === 'heading') {
    return Math.round(config.headingFontSize * exportScale)
  }
  if (type === 'code') {
    return Math.round(config.codeFontSize * exportScale)
  }
  return config.bodyFontSize * exportScale
}

function blockLineHeight(block: MarkdownBlock, config: GraphicTextConfig, exportScale: number) {
  const type = resolveStyleType(block)
  const size = blockFontSize(block, config, exportScale)
  if (type === 'title') return size * config.titleLineHeight
  if (type === 'heading') return size * config.headingLineHeight
  if (type === 'code') return size * config.codeLineHeight
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

  if (type === 'title') return size * config.titleMarginBottom + flexGap + blockGap(layout)
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
  if (type === 'title') return size * config.titleMarginTop
  if (type === 'heading') return size * config.headingMarginTop
  return 0
}

function markdownImageToLayoutLine(
  block: MarkdownBlock,
  config: GraphicTextConfig,
  layout: GraphicLayout,
): LayoutLine[] {
  if (!block.imageUrl) return []
  const contentWidth = layout.pageWidth - layout.safeX * 2
  const availableHeight = layout.contentBottom - layout.safeTop
  const maxHeight = availableHeight * 0.9
  const naturalWidth = block.imageWidth && block.imageWidth > 0 ? block.imageWidth : 16
  const naturalHeight = block.imageHeight && block.imageHeight > 0 ? block.imageHeight : 9
  const asset: GraphicAsset = {
    id: block.id,
    url: block.imageUrl,
    width: naturalWidth,
    height: naturalHeight,
  }
  const { width, height } = measureImageLayoutSize(asset, contentWidth, maxHeight, 'width')
  const margin = config.bodyFontSize * layout.exportScale * DEFAULT_IMAGE_MARGIN
  return [
    {
      id: `${block.id}-img`,
      type: 'image',
      styleType: 'image',
      text: '',
      lineHeight: height,
      spacingBefore: margin,
      spacingAfter: margin + blockGap(layout),
      sourceBlockId: block.id,
      charOffset: 0,
      imageUrl: block.imageUrl,
      imageWidth: width,
      imageHeight: height,
    },
  ]
}

function blockToLayoutLines(
  block: MarkdownBlock,
  config: GraphicTextConfig,
  layout: GraphicLayout,
): LayoutLine[] {
  const styleType = resolveStyleType(block)
  if (styleType === 'image') {
    return markdownImageToLayoutLine(block, config, layout)
  }
  const plainText = stripHighlightMarkers(block.text)
  const { fontFamily } = getFontConfigForStyleType(config, styleType)
  const fontWeight = styleType === 'title' || styleType === 'heading' ? 700 : 400

  if (styleType === 'title') {
    const sentences = splitTitleSentences(plainText)
    const lines: LayoutLine[] = []
    let lineIndex = 0
    let searchFrom = 0

    for (let sentenceIndex = 0; sentenceIndex < sentences.length; sentenceIndex += 1) {
      const sentence = sentences[sentenceIndex]
      const sentenceStart = plainText.indexOf(sentence, searchFrom)
      let charOffset = sentenceStart >= 0 ? sentenceStart : searchFrom
      searchFrom = charOffset + sentence.length
      const sentenceBlock: MarkdownBlock = { ...block, titleSentenceIndex: sentenceIndex }
      const size = blockFontSize(sentenceBlock, config, layout.exportScale)
      const availableWidth = layout.pageWidth - layout.safeX * 2
      const wrapped = wrapPlainTextLinesByWidth(
        sentence,
        fontFamily,
        size,
        fontWeight,
        availableWidth,
      )
      const lineHeight = blockLineHeight(sentenceBlock, config, layout.exportScale)

      for (let wrapIndex = 0; wrapIndex < wrapped.length; wrapIndex += 1) {
        const lineText = wrapped[wrapIndex]
        const isFirstLine = lineIndex === 0
        const isLastLine =
          sentenceIndex === sentences.length - 1 && wrapIndex === wrapped.length - 1
        lines.push({
          id: `${block.id}-l${lineIndex}`,
          type: isFirstLine ? block.type : 'paragraph',
          styleType,
          text:
            sentences.length === 1 && wrapped.length === 1 ? block.text : lineText,
          lineHeight,
          spacingBefore: blockSpacingBefore(block, config, layout.exportScale, isFirstLine),
          spacingAfter: blockSpacingAfter(
            sentenceBlock,
            config,
            layout.exportScale,
            layout,
            isLastLine,
          ),
          sourceBlockId: block.id,
          charOffset,
          titleSentenceIndex: sentenceIndex,
          pageBreakBefore: isFirstLine ? block.pageBreakBefore : undefined,
        })
        charOffset += [...lineText].length
        lineIndex += 1
      }
    }

    return lines.length
      ? lines
      : [
          {
            id: `${block.id}-l0`,
            type: block.type,
            styleType,
            text: block.text,
            lineHeight: blockLineHeight(block, config, layout.exportScale),
            spacingBefore: blockSpacingBefore(block, config, layout.exportScale, true),
            spacingAfter: blockSpacingAfter(block, config, layout.exportScale, layout, true),
            sourceBlockId: block.id,
            charOffset: 0,
            titleSentenceIndex: 0,
            pageBreakBefore: block.pageBreakBefore,
          },
        ]
  }

  const size = blockFontSize(block, config, layout.exportScale)
  const inset =
    block.type === 'list'
      ? size * 1.35
      : block.type === 'quote' || styleType === 'quote'
        ? size * 0.55
        : block.type === 'code' || styleType === 'code'
          ? size * CODE_HORIZONTAL_PADDING_SCALE * 2
          : 0
  const availableWidth = layout.pageWidth - layout.safeX * 2 - inset
  const wrappedLines =
    block.type === 'code' || styleType === 'code'
      ? wrapCodeTextLines(
          plainText,
          estimateCodeLineWidth(size, availableWidth),
          size,
          fontFamily,
        )
      : wrapPlainTextLinesByWidth(
          plainText,
          fontFamily,
          size,
          fontWeight,
          availableWidth,
        )
  const lineHeight = blockLineHeight(block, config, layout.exportScale)

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
      pageBreakBefore: index === 0 ? block.pageBreakBefore : undefined,
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
    titleSentenceIndex: line.titleSentenceIndex,
    imageUrl: line.imageUrl,
    imageWidth: line.imageWidth,
    imageHeight: line.imageHeight,
  }))
}

export function paginateMarkdown(markdown: string, config: GraphicTextConfig): GraphicTextPage[] {
  return paginateDocument({ blocks: [{ id: 'legacy', kind: 'markdown', text: markdown }], assets: {} }, config)
}

function imageBlockSpacingBefore(block: ImageContentBlock, config: GraphicTextConfig, exportScale: number) {
  return config.bodyFontSize * exportScale * block.marginTop
}

function imageBlockSpacingAfter(
  block: ImageContentBlock,
  config: GraphicTextConfig,
  exportScale: number,
  layout: GraphicLayout,
) {
  const size = config.bodyFontSize * exportScale
  return size * block.marginBottom + size * 0.18 + blockGap(layout)
}

function imageBlockToLayoutLine(
  block: ImageContentBlock,
  asset: GraphicAsset,
  config: GraphicTextConfig,
  layout: GraphicLayout,
): LayoutLine {
  const contentWidth = layout.pageWidth - layout.safeX * 2
  const availableHeight = layout.contentBottom - layout.safeTop
  const { width, height } = measureImageLayoutSize(
    asset,
    contentWidth,
    availableHeight,
    block.fit,
  )

  return {
    id: block.id,
    type: 'image',
    styleType: 'image',
    text: '',
    lineHeight: height,
    spacingBefore: imageBlockSpacingBefore(block, config, layout.exportScale),
    spacingAfter: imageBlockSpacingAfter(block, config, layout.exportScale, layout),
    sourceBlockId: block.id,
    charOffset: 0,
    imageUrl: asset.url,
    imageWidth: width,
    imageHeight: height,
  }
}

function documentBlockToLayoutLines(
  block: ContentBlock,
  document: GraphicDocument,
  config: GraphicTextConfig,
  layout: GraphicLayout,
): LayoutLine[] {
  if (block.kind === 'markdown') {
    return parseScopedMarkdown(block.id, block.text).flatMap((markdownBlock) =>
      blockToLayoutLines(markdownBlock, config, layout),
    )
  }

  const asset = document.assets[block.assetId]
  if (!asset) return []
  return [imageBlockToLayoutLine(block, asset, config, layout)]
}

export function paginateDocument(document: GraphicDocument, config: GraphicTextConfig): GraphicTextPage[] {
  const baseLayout = getGraphicLayout(config, { pageIndex: 1 })
  const firstLayout = getGraphicLayout(config, { pageIndex: 0 })
  const availableHeightDefault = baseLayout.contentBottom - baseLayout.safeTop
  const availableHeightFirst = firstLayout.contentBottom - firstLayout.safeTop
  const allLines: LayoutLine[] = []
  let forcePageBreakBeforeNext = false

  for (const block of document.blocks) {
    if (block.kind === 'markdown' && isPageBreakMarker(block.text)) {
      forcePageBreakBeforeNext = true
      continue
    }
    if (block.kind === 'markdown' && (block as MarkdownContentBlock).pageBreakBefore) {
      forcePageBreakBeforeNext = true
    }

    const blockLines = documentBlockToLayoutLines(block, document, config, baseLayout)
    if (forcePageBreakBeforeNext && blockLines[0]) {
      blockLines[0].pageBreakBefore = true
      forcePageBreakBeforeNext = false
    }
    allLines.push(...blockLines)
  }

  if (!allLines.length) {
    return [{ index: 0, blocks: [] }]
  }

  const pages: GraphicTextPage[] = []
  let currentLines: LayoutLine[] = []
  let usedHeight = 0

  const pageCapacity = () =>
    pages.length === 0 ? availableHeightFirst : availableHeightDefault

  for (const line of allLines) {
    const lineTotal = line.spacingBefore + line.lineHeight + line.spacingAfter

    if (line.pageBreakBefore && currentLines.length > 0) {
      pages.push({ index: pages.length, blocks: layoutLinesToBlocks(currentLines) })
      currentLines = []
      usedHeight = 0
    }

    if (currentLines.length > 0 && usedHeight + lineTotal > pageCapacity()) {
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
