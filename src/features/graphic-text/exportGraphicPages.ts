import { getGraphicLayout } from './layout'
import type { GraphicTextConfig, GraphicTextPage, MarkdownBlock } from './types'
import { FONT_OPTIONS } from '../../data/fonts'
import { ensureFontReady } from '../../utils/fontLoad'
import { parseInlineHighlights, stripHighlightMarkers, themeAlpha } from './inlineHighlight'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('参考图加载失败'))
    image.src = src
  })
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
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

function wrapSegments(
  ctx: CanvasRenderingContext2D,
  segments: LineSegment[],
  maxWidth: number,
): LineSegment[][] {
  const lines: LineSegment[][] = [[]]
  let lineWidth = 0

  const pushChar = (char: string, highlighted: boolean) => {
    const currentLine = lines[lines.length - 1]
    const last = currentLine[currentLine.length - 1]
    if (last && last.highlighted === highlighted) {
      last.text += char
    } else {
      currentLine.push({ text: char, highlighted })
    }
    lineWidth += ctx.measureText(char).width
  }

  const newLine = () => {
    lines.push([])
    lineWidth = 0
  }

  for (const segment of segments) {
    for (const char of [...segment.text]) {
      const nextWidth = lineWidth + ctx.measureText(char).width
      if (lineWidth > 0 && nextWidth > maxWidth) newLine()
      pushChar(char, segment.highlighted)
    }
  }

  if (!lines[0].length) lines[0].push({ text: '', highlighted: false })
  return lines
}

function blockSpec(block: MarkdownBlock, config: GraphicTextConfig, exportScale: number) {
  if (block.type === 'title') {
    return {
      size: config.titleFontSize * exportScale,
      weight: 700,
      lineHeight: 1.22,
      spacing: 0.8,
    }
  }
  if (block.type === 'heading') {
    return {
      size: Math.round(config.titleFontSize * 0.72 * exportScale),
      weight: 700,
      lineHeight: 1.35,
      spacing: 0.65,
    }
  }
  return {
    size: config.bodyFontSize * exportScale,
    weight: 400,
    lineHeight: 1.55,
    spacing: 0.55,
  }
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  style: GraphicTextConfig['topStyle'],
  x: number,
  y: number,
  width: number,
  height: number,
  themeColor: string,
) {
  if (style === 'bar') {
    ctx.fillStyle = themeColor
    roundedRect(ctx, x, y, width, height, 14)
    ctx.fill()
  } else if (style === 'outline') {
    ctx.fillStyle = 'rgba(255,255,255,.86)'
    ctx.strokeStyle = '#171717'
    ctx.lineWidth = 3
    roundedRect(ctx, x, y, width, height, 12)
    ctx.fill()
    ctx.stroke()
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.78)'
    roundedRect(ctx, x, y, width, height, 12)
    ctx.fill()
  }
}

function drawHighlightedLine(
  ctx: CanvasRenderingContext2D,
  segments: LineSegment[],
  x: number,
  y: number,
  lineHeight: number,
  themeColor: string,
  enableHighlight: boolean,
) {
  let cursorX = x
  const paddingX = 4
  const paddingY = 3

  if (enableHighlight) {
    let bgX = x
    for (const segment of segments) {
      if (!segment.text) continue
      const width = ctx.measureText(segment.text).width
      if (segment.highlighted) {
        ctx.fillStyle = themeAlpha(themeColor, 0.28)
        ctx.fillRect(bgX - paddingX, y - paddingY, width + paddingX * 2, lineHeight)
      }
      bgX += width
    }
  }

  cursorX = x
  for (const segment of segments) {
    if (!segment.text) continue
    ctx.fillStyle = '#171717'
    ctx.fillText(segment.text, cursorX, y)
    if (enableHighlight && segment.highlighted) {
      const width = ctx.measureText(segment.text).width
      ctx.strokeStyle = themeColor
      ctx.lineWidth = Math.max(2, lineHeight * 0.08)
      ctx.beginPath()
      ctx.moveTo(cursorX, y + lineHeight * 0.18)
      ctx.lineTo(cursorX + width, y + lineHeight * 0.18)
      ctx.stroke()
    }
    cursorX += ctx.measureText(segment.text).width
  }
}

async function drawPage(
  page: GraphicTextPage,
  config: GraphicTextConfig,
): Promise<Blob> {
  const layout = getGraphicLayout(config)
  const {
    pageWidth: width,
    pageHeight: height,
    safeX,
    safeTop,
    footerTop,
    footerHeight,
    footerMarginBottom,
    contentBottom,
    topBarY,
    topBarHeight,
    exportScale,
  } = layout
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
  drawEdge(ctx, config.topStyle, edgeX, topBarY, edgeWidth, topBarHeight, config.themeColor)
  ctx.fillStyle = '#171717'
  ctx.font = `600 28px ${config.fontFamily}`
  ctx.textBaseline = 'middle'
  ctx.fillText(config.topText || '图文笔记', edgeX + 28, topBarY + topBarHeight / 2, edgeWidth - 130)

  ctx.fillStyle = '#171717'
  roundedRect(ctx, width - safeX - 78, topBarY + 18, 52, 50, 25)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `600 20px ${config.fontFamily}`
  ctx.textAlign = 'center'
  ctx.fillText(String(page.index + 1).padStart(2, '0'), width - safeX - 52, topBarY + 43)
  ctx.textAlign = 'left'

  let y = safeTop
  const maxWidth = width - safeX * 2
  const maxContentY = contentBottom

  for (const block of page.blocks) {
    const spec = blockSpec(block, config, exportScale)
    const quoteInset = block.type === 'quote' ? 42 : 0
    const listInset = block.type === 'list' ? spec.size * 1.35 : 0
    ctx.font = `${spec.weight} ${spec.size}px ${config.fontFamily}`
    ctx.textBaseline = 'top'
    const plainText = stripHighlightMarkers(block.text)
    const segments =
      block.type === 'title'
        ? [{ text: plainText, highlighted: false }]
        : parseInlineHighlights(block.text).map((segment) => ({
            text: segment.text,
            highlighted: segment.highlighted,
          }))
    const lines = wrapSegments(ctx, segments, maxWidth - quoteInset - listInset)
    const lineHeight = spec.size * spec.lineHeight
    const enableHighlight = block.type !== 'title'

    if (block.type === 'quote') {
      const quoteHeight = lines.length * lineHeight + 24
      ctx.fillStyle = 'rgba(255,255,255,.72)'
      ctx.fillRect(safeX, y - 8, maxWidth, quoteHeight)
      ctx.fillStyle = config.themeColor
      ctx.fillRect(safeX, y - 8, 8, quoteHeight)
    }

    for (const [lineIndex, line] of lines.entries()) {
      if (y + lineHeight > maxContentY) break
      if (block.type === 'list' && lineIndex === 0) {
        ctx.fillStyle = config.themeColor
        ctx.fillRect(safeX, y + lineHeight * 0.42, 13, 13)
      }
      drawHighlightedLine(
        ctx,
        line,
        safeX + quoteInset + listInset,
        y,
        lineHeight,
        config.themeColor,
        enableHighlight,
      )
      y += lineHeight
    }
    y += spec.size * spec.spacing
  }

  drawEdge(
    ctx,
    config.bottomStyle,
    edgeX,
    footerTop,
    edgeWidth,
    footerHeight,
    config.themeColor,
  )
  ctx.fillStyle = '#171717'
  ctx.font = `400 22px ${config.fontFamily}`
  ctx.textBaseline = 'middle'
  ctx.fillText(
    config.bottomText || '滑动查看下一页',
    edgeX + 28,
    footerTop + footerHeight / 2,
  )
  ctx.textAlign = 'right'
  ctx.fillText(String(page.index + 1), width - safeX - 28, footerTop + footerHeight / 2)
  ctx.textAlign = 'left'

  ctx.fillStyle = config.themeColor
  ctx.fillRect(34, 34, 16, 16)
  ctx.fillStyle = '#171717'
  ctx.fillRect(width - 64, height - footerMarginBottom - 10, 10, 10)
  ctx.fillStyle = config.themeColor
  ctx.fillRect(width - 46, height - footerMarginBottom - 10, 10, 10)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1))
  if (!blob) throw new Error('页面生成失败')
  return blob
}

export async function exportGraphicPages(
  pages: GraphicTextPage[],
  config: GraphicTextConfig,
  onProgress?: (current: number, total: number) => void,
) {
  const font = FONT_OPTIONS.find((item) => item.id === config.fontId)
  if (font && font.source !== 'system') {
    const sample = pages.flatMap((page) => page.blocks.map((block) => block.text)).join('')
    await ensureFontReady(font, sample || font.sample)
  }

  const blobs: Blob[] = []
  for (let index = 0; index < pages.length; index += 1) {
    blobs.push(await drawPage(pages[index], config))
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
