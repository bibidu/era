import { getGraphicLayout } from './layout'
import type { GraphicTextConfig, GraphicTextPage, MarkdownBlock } from './types'
import { getFontById } from '../../data/fonts'
import { ensureFontReady } from '../../utils/fontLoad'
import { buildCharHighlightSegments, stripHighlightMarkers, themeAlpha } from './inlineHighlight'
import { TOP_BAR_FONT_SIZE_PX } from './graphicPreviewLayout'
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
  highlighted: boolean
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
    }
  }
  if (styleType === 'heading') {
    return {
      size: Math.round(config.headingFontSize * exportScale),
      weight: 700,
      lineHeight: config.titleLineHeight,
      spacing: config.headingMarginBottom,
      marginBefore: config.headingMarginTop,
    }
  }
  if (styleType === 'quote') {
    return {
      size: config.bodyFontSize * exportScale,
      weight: 700,
      lineHeight: config.bodyLineHeight,
      spacing: 0.08,
      marginBefore: 0,
    }
  }
  return {
    size: config.bodyFontSize * exportScale,
    weight: 400,
    lineHeight: config.bodyLineHeight,
    spacing: 0.08,
    marginBefore: 0,
  }
}

function drawHighlightedLine(
  ctx: CanvasRenderingContext2D,
  segments: LineSegment[],
  x: number,
  yTop: number,
  fontSize: number,
  themeColor: string,
  enableHighlight: boolean,
) {
  const paddingX = 4
  ctx.textBaseline = 'alphabetic'

  if (enableHighlight) {
    let bgX = x
    for (const segment of segments) {
      if (!segment.text) continue
      const metrics = ctx.measureText(segment.text)
      const ascent = metrics.actualBoundingBoxAscent ?? fontSize * 0.88
      const descent = metrics.actualBoundingBoxDescent ?? fontSize * 0.12
      if (segment.highlighted) {
        ctx.fillStyle = themeAlpha(themeColor, 0.28)
        ctx.fillRect(bgX - paddingX, yTop, metrics.width + paddingX * 2, ascent + descent + 4)
      }
      bgX += metrics.width
    }
  }

  let cursorX = x
  for (const segment of segments) {
    if (!segment.text) continue
    const metrics = ctx.measureText(segment.text)
    const ascent = metrics.actualBoundingBoxAscent ?? fontSize * 0.88
    const descent = metrics.actualBoundingBoxDescent ?? fontSize * 0.12
    const baselineY = yTop + ascent
    ctx.fillStyle = '#171717'
    ctx.fillText(segment.text, cursorX, baselineY)
    if (enableHighlight && segment.highlighted) {
      const underlineY = baselineY + descent + Math.max(2, fontSize * 0.05)
      ctx.strokeStyle = themeColor
      ctx.lineWidth = Math.max(2, fontSize * 0.06)
      ctx.beginPath()
      ctx.moveTo(cursorX, underlineY)
      ctx.lineTo(cursorX + metrics.width, underlineY)
      ctx.stroke()
    }
    cursorX += metrics.width
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
  const highlightedKeys = new Set(config.highlightedCharKeys)
  const topBar = resolveTopBarParts(config, markdown)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')

  ctx.fillStyle = '#FBF7ED'
  ctx.fillRect(0, 0, width, height)

  if (config.template === 'reference' && config.backgroundUrl) {
    const image = await loadImage(config.backgroundUrl)
    drawCoverImage(ctx, image, width, height)
    ctx.fillStyle = 'rgba(255,255,255,.82)'
    ctx.fillRect(0, 0, width, height)
  } else if (config.template === 'grid') {
    ctx.strokeStyle = 'rgba(23,23,23,.055)'
    ctx.lineWidth = 1
    for (let x = 0; x <= width; x += 35) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += 35) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
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
  const blockGap = width * 0.011
  let quoteBarStart: number | null = null

  for (const block of page.blocks) {
    const spec = blockSpec(block, config, exportScale)
    const styleType = resolveStyleType(block)
    if (block.type === 'title' || block.type === 'heading') {
      y += spec.size * spec.marginBefore
    }

    ctx.font = `${spec.weight} ${spec.size}px ${config.fontFamily}`
    const plainText = stripHighlightMarkers(block.text)
    const blockId = block.sourceBlockId ?? block.id
    const charOffset = block.charOffset ?? 0
    const inset =
      block.type === 'list'
        ? listInset(spec.size)
        : block.type === 'quote' || styleType === 'quote'
          ? quoteInset(spec.size)
          : 0
    const enableHighlight = true
    const segments = enableHighlight
      ? buildCharHighlightSegments(block.text, blockId, highlightedKeys, charOffset)
      : [{ text: plainText, highlighted: false }]
    const lineHeight = spec.size * spec.lineHeight
    const textMetrics = ctx.measureText(plainText || '文')
    const ascent = textMetrics.actualBoundingBoxAscent ?? spec.size * 0.88

    if (block.type === 'quote') {
      quoteBarStart = y
    }

    if (block.type === 'list') {
      const bulletRadius = spec.size * 0.16
      const centerY = y + ascent * 0.48
      ctx.fillStyle = '#262626'
      ctx.beginPath()
      ctx.arc(safeX + bulletRadius * 2, centerY, bulletRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    drawHighlightedLine(
      ctx,
      segments,
      safeX + inset,
      y,
      spec.size,
      config.themeColor,
      enableHighlight,
    )
    y += lineHeight

    if (styleType === 'quote' && block.isBlockEnd && quoteBarStart !== null) {
      const barWidth = Math.max(3, spec.size * 0.12)
      ctx.fillStyle = config.themeColor
      ctx.fillRect(safeX, quoteBarStart, barWidth, y - quoteBarStart)
      quoteBarStart = null
    }

    if (block.isBlockEnd) {
      y += spec.size * (spec.spacing + 0.18) + blockGap
    }
  }

  ctx.fillStyle = config.themeColor
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
  const sample = pages.flatMap((page) => page.blocks.map((block) => block.text)).join('')
  const fonts = [getFontById(config.chineseFontId), getFontById(config.englishFontId)]
  const uniqueFonts = [...new Map(fonts.map((font) => [font.id, font])).values()]

  await Promise.all(
    uniqueFonts
      .filter((font) => font.source !== 'system')
      .map((font) => ensureFontReady(font, sample || font.sample)),
  )

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
