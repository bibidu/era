import {
  CODE_BACKGROUND,
  CODE_FONT_FAMILY,
  CODE_HORIZONTAL_PADDING_SCALE,
  CODE_SIZE_SCALE,
  CODE_TEXT_COLOR,
  CODE_VERTICAL_PADDING_SCALE,
} from './codeBlock'
import { buildCircleHighlightColorRuns, drawHandDrawnCircleAroundTextBounds } from './circleHighlight'
import { getGraphicLayout } from './layout'
import type { GraphicTextConfig, GraphicTextPage, MarkdownBlock } from './types'
import { getFontById } from '../../data/fonts'
import { ensureFontReady } from '../../utils/fontLoad'
import { buildCharHighlightColorSegments, stripHighlightMarkers, themeAlpha } from './inlineHighlight'
import { blockHasHighlightInMap, resolveBlockHighlightColor } from './highlightColors'
import { TOP_BAR_FONT_SIZE_PX } from './graphicPreviewLayout'
import {
  drawPageGridOverlay,
  resolvePageBaseFillColor,
} from './pageBackground'
import { drawPageGradientBackground } from './pageGradientOverlay'
import { drawPagePaperOverlay } from './pagePaperOverlay'
import { drawPagePixelOverlay } from './pagePixelOverlay'
import {
  shouldDrawBaseBackground,
  shouldDrawPageOverlay,
  shouldDrawReferenceBackground,
} from './pageLayering'
import { resolveTopBarParts } from './topBar'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('参考图加载失败'))
    image.src = src
  })
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const sourceRatio = image.naturalWidth / image.naturalHeight
  const targetRatio = width / height
  let sx = 0
  let sy = 0
  let sw = image.naturalWidth
  let sh = image.naturalHeight

  if (sourceRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio
    sx = (image.naturalWidth - sw) / 2
  } else {
    sh = image.naturalWidth / targetRatio
    sy = (image.naturalHeight - sh) / 2
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height)
}

interface LineSegment {
  text: string
  color: string | null
}

function drawStyledLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  blockId: string,
  charOffset: number,
  segments: LineSegment[],
  circleColors: Readonly<Record<string, string>>,
  x: number,
  yTop: number,
  fontSize: number,
  enableHighlight: boolean,
  textColor: string,
  circleLineWidth: number,
) {
  const paddingX = 4
  const plainText = stripHighlightMarkers(text)
  ctx.textBaseline = 'alphabetic'
  const textMetrics = ctx.measureText(plainText || '文')
  const ascent = textMetrics.actualBoundingBoxAscent ?? fontSize * 0.88
  const descent = textMetrics.actualBoundingBoxDescent ?? fontSize * 0.12
  const baselineY = yTop + ascent
  const underlineY = baselineY + fontSize * 0.1

  if (enableHighlight) {
    let bgX = x
    for (const segment of segments) {
      if (!segment.text) continue
      const metrics = ctx.measureText(segment.text)
      if (segment.color) {
        ctx.fillStyle = themeAlpha(segment.color, 0.28)
        ctx.fillRect(bgX - paddingX, yTop, metrics.width + paddingX * 2, ascent + descent + 4)
      }
      bgX += metrics.width
    }
  }

  ctx.fillStyle = textColor
  ctx.fillText(plainText, x, baselineY)

  if (enableHighlight) {
    const circleRuns = buildCircleHighlightColorRuns(plainText, blockId, charOffset, circleColors)
    for (const run of circleRuns) {
      const prefix = plainText.slice(0, run.start)
      const runX = x + ctx.measureText(prefix).width
      const runWidth = ctx.measureText(run.text).width
      drawHandDrawnCircleAroundTextBounds(
        ctx,
        runX,
        yTop,
        runWidth,
        ascent,
        descent,
        run.color,
        Math.max(4, circleLineWidth),
      )
    }

    let underlineX = x
    for (const segment of segments) {
      if (!segment.text) continue
      const metrics = ctx.measureText(segment.text)
      if (segment.color) {
        ctx.strokeStyle = segment.color
        ctx.lineWidth = Math.max(2, fontSize * 0.06)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(underlineX, underlineY)
        ctx.lineTo(underlineX + metrics.width, underlineY)
        ctx.stroke()
      }
      underlineX += metrics.width
    }
  }
}

function resolveStyleType(block: MarkdownBlock) {
  return block.styleType ?? block.type
}

function blockSpec(block: MarkdownBlock, config: GraphicTextConfig, exportScale: number) {
  const styleType = resolveStyleType(block)
  if (styleType === 'title') {
    return {
      size: config.titleFontSize * exportScale,
      weight: 700,
      lineHeight: config.titleLineHeight,
      spacing: config.titleMarginBottom,
      marginBefore: config.titleMarginTop,
      fontFamily: config.fontFamily,
    }
  }
  if (styleType === 'heading') {
    return {
      size: Math.round(config.headingFontSize * exportScale),
      weight: 700,
      lineHeight: config.titleLineHeight,
      spacing: config.headingMarginBottom,
      marginBefore: config.headingMarginTop,
      fontFamily: config.fontFamily,
    }
  }
  if (styleType === 'quote') {
    return {
      size: config.bodyFontSize * exportScale,
      weight: 700,
      lineHeight: config.bodyLineHeight,
      spacing: 0.08,
      marginBefore: 0,
      fontFamily: config.fontFamily,
    }
  }
  if (styleType === 'code') {
    return {
      size: Math.round(config.bodyFontSize * CODE_SIZE_SCALE * exportScale),
      weight: 400,
      lineHeight: config.bodyLineHeight,
      spacing: 0.08,
      marginBefore: 0,
      fontFamily: CODE_FONT_FAMILY,
    }
  }
  return {
    size: config.bodyFontSize * exportScale,
    weight: 400,
    lineHeight: config.bodyLineHeight,
    spacing: 0.08,
    marginBefore: 0,
    fontFamily: config.fontFamily,
  }
}

async function drawPage(
  page: GraphicTextPage,
  config: GraphicTextConfig,
  markdown: string,
): Promise<Blob> {
  const layout = getGraphicLayout(config)
  const {
    pageWidth: width,
    pageHeight: height,
    safeX,
    safeTop,
    topBarY,
    topBarHeight,
    exportScale,
  } = layout
  const underlineColors = config.underlineHighlightColors
  const quoteColors = config.quoteHighlightColors
  const circleColors = config.circleHighlightColors
  const accentColor = config.highlightPickerColor
  const topBar = resolveTopBarParts(config, markdown)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')

  if (shouldDrawBaseBackground(config)) {
    ctx.fillStyle = resolvePageBaseFillColor(config)
    ctx.fillRect(0, 0, width, height)

    if (shouldDrawReferenceBackground(config) && config.backgroundUrl) {
      const image = await loadImage(config.backgroundUrl)
      drawCoverImage(ctx, image, width, height)
      ctx.fillStyle = 'rgba(255,255,255,.82)'
      ctx.fillRect(0, 0, width, height)
    }
  } else if (config.pageOverlay === 'gradient') {
    drawPageGradientBackground(ctx, width, height)
  } else if (config.pageOverlay === 'pixel') {
    drawPagePixelOverlay(ctx, width, height, false)
  }

  if (shouldDrawPageOverlay(config) && config.pageOverlay === 'grid') {
    drawPageGridOverlay(ctx, width, height)
  }

  if (shouldDrawPageOverlay(config) && config.pageOverlay === 'pixel' && config.overlayStacked) {
    drawPagePixelOverlay(ctx, width, height, true)
  }

  if (shouldDrawPageOverlay(config) && config.pageOverlay === 'paper') {
    drawPagePaperOverlay(ctx, width, height)
  }

  if (shouldDrawPageOverlay(config) && config.pageOverlay === 'gradient' && config.overlayStacked) {
    drawPageGradientBackground(ctx, width, height)
  }

  const edgeX = safeX
  const edgeWidth = width - safeX * 2
  const underlineY = topBarY + topBarHeight - 6

  ctx.strokeStyle = '#D4D4D4'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(edgeX, underlineY)
  ctx.lineTo(edgeX + edgeWidth, underlineY)
  ctx.stroke()

  ctx.fillStyle = '#525252'
  const topBarFontSize = Math.round(TOP_BAR_FONT_SIZE_PX * exportScale)
  ctx.font = `400 ${topBarFontSize}px ${config.fontFamily}`
  ctx.textBaseline = 'bottom'
  const topBarTextY = underlineY - 8
  const topBarMetrics = ctx.measureText(topBar.countText || '文')
  const topBarAscent = topBarMetrics.actualBoundingBoxAscent ?? topBarFontSize * 0.85
  const topBarDescent = topBarMetrics.actualBoundingBoxDescent ?? topBarFontSize * 0.15
  const topBarMidY = topBarTextY - (topBarAscent + topBarDescent) / 2

  if (topBar.custom) {
    const gap = Math.max(6, Math.round(8 * exportScale))
    const dividerWidth = Math.max(1, Math.round(exportScale))
    const dividerHeight = Math.round(topBarFontSize * 0.85)
    const countWidth = ctx.measureText(topBar.countText).width
    const customMaxWidth = edgeWidth - countWidth - gap * 2 - dividerWidth
    let customText = topBar.custom
    while (customText.length > 1 && ctx.measureText(`${customText}…`).width > customMaxWidth) {
      customText = customText.slice(0, -1)
    }
    if (customText !== topBar.custom) customText += '…'
    const customWidth = ctx.measureText(customText).width
    ctx.fillText(customText, edgeX, topBarTextY)
    const dividerX = edgeX + customWidth + gap
    ctx.fillStyle = '#D4D4D4'
    ctx.fillRect(dividerX, topBarMidY - dividerHeight / 2, dividerWidth, dividerHeight)
    ctx.fillStyle = '#525252'
    ctx.fillText(topBar.countText, dividerX + gap + dividerWidth, topBarTextY)
  } else {
    ctx.fillText(topBar.countText, edgeX, topBarTextY, edgeWidth)
  }

  let y = safeTop
  const listInset = (size: number) => size * 1.35
  const quoteInset = (size: number) => size * 0.55
  const codeInset = (size: number) => size * CODE_HORIZONTAL_PADDING_SCALE
  const blockGap = width * 0.011
  let codeBlockSourceId: string | null = null

  const circleLineWidth = Math.max(4, 4 * exportScale)

  for (const block of page.blocks) {
    const spec = blockSpec(block, config, exportScale)
    const styleType = resolveStyleType(block)
    if (block.type === 'title' || block.type === 'heading') {
      y += spec.size * spec.marginBefore
    }

    ctx.font = `${spec.weight} ${spec.size}px ${spec.fontFamily}`
    const plainText = stripHighlightMarkers(block.text)
    const blockId = block.sourceBlockId ?? block.id
    const charOffset = block.charOffset ?? 0
    const hasQuoteHighlightBar = blockHasHighlightInMap(block, quoteColors)
    const quoteColor = resolveBlockHighlightColor(block, quoteColors)
    const quoteBarInset = hasQuoteHighlightBar ? quoteInset(spec.size) : 0
    const inset =
      block.type === 'list'
        ? listInset(spec.size) + quoteBarInset
        : block.type === 'code' || styleType === 'code'
          ? codeInset(spec.size)
          : quoteBarInset
    const enableHighlight = true
    const segments = enableHighlight
      ? buildCharHighlightColorSegments(block.text, blockId, underlineColors, charOffset)
      : [{ text: plainText, color: null }]
    const lineHeight = spec.size * spec.lineHeight
    const textMetrics = ctx.measureText(plainText || '文')
    const ascent = textMetrics.actualBoundingBoxAscent ?? spec.size * 0.88

    if (styleType === 'code') {
      if (codeBlockSourceId !== blockId) {
        codeBlockSourceId = blockId
      }
      const padY = spec.size * CODE_VERTICAL_PADDING_SCALE
      const bgX = safeX
      const bgW = width - safeX * 2
      ctx.fillStyle = CODE_BACKGROUND
      ctx.fillRect(bgX, y - padY * 0.35, bgW, lineHeight + padY * 0.7)
    } else {
      codeBlockSourceId = null
    }

    if (block.type === 'list') {
      const bulletRadius = spec.size * 0.16
      const centerY = y + ascent * 0.48
      ctx.fillStyle = '#262626'
      ctx.beginPath()
      ctx.arc(safeX + quoteBarInset + bulletRadius * 2, centerY, bulletRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    if (hasQuoteHighlightBar && quoteColor) {
      const barWidth = Math.max(4, spec.size * 0.18)
      ctx.fillStyle = quoteColor
      ctx.fillRect(safeX, y, barWidth, lineHeight)
    }

    drawStyledLine(
      ctx,
      block.text,
      blockId,
      charOffset,
      segments,
      circleColors,
      safeX + inset,
      y,
      spec.size,
      enableHighlight,
      styleType === 'code' ? CODE_TEXT_COLOR : '#171717',
      circleLineWidth,
    )
    y += lineHeight

    if (styleType === 'code' && block.isBlockEnd) {
      codeBlockSourceId = null
    }

    if (block.isBlockEnd) {
      y += spec.size * (spec.spacing + 0.18) + blockGap
    }
  }

  ctx.fillStyle = accentColor
  ctx.fillRect(34, 34, 16, 16)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1))
  if (!blob) throw new Error('页面生成失败')
  return blob
}

export async function exportGraphicPages(
  pages: GraphicTextPage[],
  config: GraphicTextConfig,
  markdown: string,
  onProgress?: (current: number, total: number) => void,
) {
  const font = getFontById(config.fontId)
  if (font.source !== 'system') {
    const sample = pages.flatMap((page) => page.blocks.map((block) => block.text)).join('')
    await ensureFontReady(font, sample || font.sample)
  }

  const blobs: Blob[] = []
  for (let index = 0; index < pages.length; index += 1) {
    blobs.push(await drawPage(pages[index], config, markdown))
    onProgress?.(index + 1, pages.length)
    await new Promise((resolve) => window.setTimeout(resolve, 16))
  }
  return blobs
}

export async function saveGraphicPages(blobs: Blob[]) {
  const files = blobs.map(
    (blob, index) =>
      new File([blob], `graphic-page-${String(index + 1).padStart(2, '0')}.png`, {
        type: 'image/png',
      }),
  )

  if (navigator.share && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title: '图文页面' })
      return
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
    }
  }

  for (const file of files) {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    link.remove()
    await new Promise((resolve) => window.setTimeout(resolve, 250))
    URL.revokeObjectURL(url)
  }
}
