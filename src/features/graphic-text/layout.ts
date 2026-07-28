import type {
  ContentBlock,
  GraphicAsset,
  GraphicDocument,
  ImageContentBlock,
} from './document'
import { DEFAULT_IMAGE_MARGIN, parseScopedMarkdown } from './document'
import { getFontConfigForStyleType } from './graphicTextFonts'
import { measureImageLayoutSize } from './imageAsset'
import { stripHighlightMarkers } from './inlineHighlight'
import { stripTitleBreakMarkers, titlePlainText, parseGlyphEmphasis, resolveGlyphSizePx, measureEmphasisAdvance } from './glyphEmphasis'
import {
  CODE_HORIZONTAL_PADDING_SCALE,
  estimateCodeLineWidth,
  wrapCodeTextLines,
} from './codeBlock'
import { wrapPlainTextLinesByWidth } from './textWrap'
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
  titleFontSizeOverride?: number
  imageUrl?: string
  imageWidth?: number
  imageHeight?: number
}

/** 按句末标点切开标题，使第二句可换行并用次级字号 */
export function splitTitleSentences(text: string): string[] {
  const plain = text.trim()
  if (!plain) return ['']
  // 显式换行：`|` 或换行符（用于风水标题多行排版）
  const explicit = plain
    .split(/\n|\|/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (explicit.length > 1) return explicit
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

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim()
    if (text) blocks.push(createBlock('paragraph', text, blocks.length))
    paragraph = []
  }

  const flushCodeBlock = () => {
    if (!codeLines.length) return
    blocks.push(createBlock('code', codeLines.join('\n'), blocks.length))
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

    if (isImageMarkdownLine(line)) {
      flushParagraph()
      blocks.push(createImageBlock(line, blocks.length))
    } else if (line.startsWith('# ')) {
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
    } else {
      paragraph.push(line)
    }
  }

  flushParagraph()
  if (inCodeBlock) flushCodeBlock()
  return blocks
}

function resolveTitleFontSize(block: MarkdownBlock, config: GraphicTextConfig) {
  if (typeof block.titleFontSizeOverride === 'number' && block.titleFontSizeOverride > 0) {
    return block.titleFontSizeOverride
  }
  const secondarySize = config.titleSecondaryFontSize ?? Math.round(config.titleFontSize * 0.72)
  const lineText = stripHighlightMarkers(block.text).trim()
  // 「上篇」/（上篇）等篇名标记用次字号
  if (/^[「（(]/.test(lineText)) return secondarySize
  if ((block.titleSentenceIndex ?? 0) > 0) return secondarySize
  return config.titleFontSize
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
    const fullPlain = titlePlainText(block.text)
    const rawPlain = stripHighlightMarkers(block.text)
    const explicitBreaks = /[|\n]/.test(rawPlain)
    const sentences = splitTitleSentences(rawPlain)
    const lines: LayoutLine[] = []
    let charOffset = 0
    let lineIndex = 0

    for (let sentenceIndex = 0; sentenceIndex < sentences.length; sentenceIndex += 1) {
      const sentence = sentences[sentenceIndex]
      // 显式 | 换行：非篇名行保持主字号；篇名「」用次字号
      const effectiveSentenceIndex = explicitBreaks
        ? /^[「（(]/.test(sentence.trim())
          ? 1
          : 0
        : sentenceIndex
      let sentenceBlock: MarkdownBlock = {
        ...block,
        text: sentence,
        titleSentenceIndex: effectiveSentenceIndex,
      }
      const availableWidth = layout.pageWidth - layout.safeX * 2
      let size = blockFontSize(sentenceBlock, config, layout.exportScale)

      // 显式换行：禁止再按宽度折行；若超宽则缩小该行字号以单行放下
      // 测量须计入 glyphEmphasis 的 scaleX + 侧向空隙，否则缩完仍会挤在一起
      let wrapped: string[]
      if (explicitBreaks) {
        if (typeof document !== 'undefined') {
          const ctx = document.createElement('canvas').getContext('2d')
          if (ctx) {
            const primary = fontFamily.replace(/"/g, '').split(',')[0].trim()
            const emphasisMap = config.glyphEmphasis ?? {}
            const hasWidthEm = [...sentence].some((_, i) => {
              const emph = parseGlyphEmphasis(emphasisMap[`${block.id}:${charOffset + i}`])
              return emph?.widthEm != null
            })
            const measureLine = (fitPx: number) => {
              let total = 0
              const chars = [...sentence]
              // fitPx 是整行缩放后的主字号；有 widthEm 时按设计字号*当前缩放比测量
              const scaleRatio = size > 0 ? fitPx / size : 1
              for (let i = 0; i < chars.length; i += 1) {
                const key = `${block.id}:${charOffset + i}`
                const emphasis = parseGlyphEmphasis(emphasisMap[key])
                if (emphasis) {
                  const sizePx = emphasis.fontSize != null
                    ? emphasis.fontSize * layout.exportScale * scaleRatio
                    : fitPx
                  ctx.font = `${fontWeight} ${sizePx}px ${emphasis.fontFamily}`
                  let natural = ctx.measureText(chars[i]).width
                  if (!(natural > 1)) {
                    ctx.font = `${fontWeight} ${sizePx}px ${primary}`
                    natural = ctx.measureText(chars[i]).width || sizePx
                  }
                  total += measureEmphasisAdvance(natural, emphasis, sizePx)
                } else {
                  ctx.font = `${fontWeight} ${fitPx}px ${primary}`
                  total += ctx.measureText(chars[i]).width
                }
              }
              return total
            }
            // TitleAdjust 已手调宽度：不再整体压字号
            if (!hasWidthEm) {
              let fit = size
              while (fit > 24 * layout.exportScale) {
                if (measureLine(fit) <= availableWidth + 6) break
                fit -= layout.exportScale
              }
              if (fit < size) {
                const override = fit / layout.exportScale
                sentenceBlock = { ...sentenceBlock, titleFontSizeOverride: override }
                size = fit
              }
            }
          }
        }
        wrapped = [sentence]
      } else {
        wrapped = wrapPlainTextLinesByWidth(
          sentence,
          fontFamily,
          size,
          fontWeight,
          availableWidth,
        )
      }
      let lineHeight = blockLineHeight(sentenceBlock, config, layout.exportScale)
      const emphasisMapForLine = config.glyphEmphasis ?? {}
      const sentenceChars = [...sentence]
      let maxGlyphHeight = 0
      let maxGlyphSize = size
      for (let i = 0; i < sentenceChars.length; i += 1) {
        const emph = parseGlyphEmphasis(emphasisMapForLine[`${block.id}:${charOffset + i}`])
        if (!emph) continue
        const gSize = resolveGlyphSizePx(emph, size, layout.exportScale)
        maxGlyphSize = Math.max(maxGlyphSize, gSize)
        maxGlyphHeight = Math.max(maxGlyphHeight, gSize * Math.max(emph.scaleY, 1))
      }
      if (maxGlyphHeight > 0) {
        lineHeight = Math.max(lineHeight, maxGlyphHeight)
      }

      for (let wrapIndex = 0; wrapIndex < wrapped.length; wrapIndex += 1) {
        const lineText = wrapped[wrapIndex]
        const isFirstLine = lineIndex === 0
        const isLastLine =
          sentenceIndex === sentences.length - 1 && wrapIndex === wrapped.length - 1
        const spacingAfter = blockSpacingAfter(
          sentenceBlock,
          config,
          layout.exportScale,
          layout,
          isLastLine,
        )
        let boxHeight = lineHeight
        if (
          !isLastLine &&
          typeof config.titleLineGapEm === 'number' &&
          Number.isFinite(config.titleLineGapEm)
        ) {
          boxHeight = lineHeight + maxGlyphSize * config.titleLineGapEm
        }
        lines.push({
          id: `${block.id}-l${lineIndex}`,
          type: isFirstLine ? block.type : 'paragraph',
          styleType,
          text:
            sentences.length === 1 && wrapped.length === 1
              ? stripTitleBreakMarkers(block.text)
              : lineText,
          lineHeight: boxHeight,
          spacingBefore: blockSpacingBefore(block, config, layout.exportScale, isFirstLine),
          spacingAfter,
          sourceBlockId: block.id,
          charOffset,
          titleSentenceIndex: effectiveSentenceIndex,
          titleFontSizeOverride: sentenceBlock.titleFontSizeOverride,
        })
        charOffset += [...lineText].length
        lineIndex += 1
      }
    }

    // 校验 charOffset 覆盖完整标题纯文本
    if (charOffset !== [...fullPlain].length && lines.length) {
      // 容忍差异：markers 已剥离
    }

    return lines.length
      ? lines
      : [
          {
            id: `${block.id}-l0`,
            type: block.type,
            styleType,
            text: stripTitleBreakMarkers(block.text),
            lineHeight: blockLineHeight(block, config, layout.exportScale),
            spacingBefore: blockSpacingBefore(block, config, layout.exportScale, true),
            spacingAfter: blockSpacingAfter(block, config, layout.exportScale, layout, true),
            sourceBlockId: block.id,
            charOffset: 0,
            titleSentenceIndex: 0,
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
    titleFontSizeOverride: line.titleFontSizeOverride,
    titleSentenceIndex: line.titleSentenceIndex,
    lineHeightOverride: line.lineHeight,
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
  const layout = getGraphicLayout(config)
  const availableHeight = layout.contentBottom - layout.safeTop
  const allLines = document.blocks.flatMap((block) =>
    documentBlockToLayoutLines(block, document, config, layout),
  )

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
