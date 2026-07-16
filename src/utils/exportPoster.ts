import type { TextElement } from '../types'
import { H_PADDING } from '../types'
import { ALL_FONT_OPTIONS } from '../data/fonts'
import { ensureFontsReadyForExport } from './fontLoad'
import { formatCanvasFont } from './pixelFont'
import { loadOrientedImageBitmap } from './imageMeta'
import { getTextWrapMaxWidth, resolvePresetColors, wrapTextContentToLines } from './textLayout'

/** 按原图尺寸绘制，避免拉伸变形 */
function drawPosterBackground(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  destWidth: number,
  destHeight: number,
) {
  ctx.drawImage(bitmap, 0, 0, destWidth, destHeight)
}

function drawDecoration(
  ctx: CanvasRenderingContext2D,
  text: TextElement,
  layout: LineLayout,
  fontSize: number,
  color: string,
) {
  if (text.textDecoration === 'none') return

  const lineWidth = Math.max(1, fontSize * 0.06)
  const gap = Math.max(1.5, fontSize * 0.05)
  const startX = layout.x - layout.left
  const endX = layout.x + layout.right

  const lineY =
    text.textDecoration === 'underline'
      ? layout.y + layout.descent + gap + lineWidth / 2
      : layout.y + (layout.descent - layout.ascent) / 2

  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(startX, lineY)
  ctx.lineTo(endX, lineY)
  ctx.stroke()
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.beginPath()
  ctx.rect(x, y, w, h)
}

const PRESET_PAD_X = 8
const PRESET_PAD_Y = 2

interface LineLayout {
  line: string
  x: number
  y: number
  left: number
  right: number
  ascent: number
  descent: number
}

function measureLineExtents(ctx: CanvasRenderingContext2D, line: string, fontSize: number) {
  const metrics = ctx.measureText(line)
  const left = metrics.actualBoundingBoxLeft ?? 0
  const right = metrics.actualBoundingBoxRight ?? metrics.width
  const ascent = metrics.actualBoundingBoxAscent ?? fontSize * 0.85
  const descent = metrics.actualBoundingBoxDescent ?? fontSize * 0.15
  return { left, right, width: left + right, ascent, descent }
}

function buildLineLayouts(
  ctx: CanvasRenderingContext2D,
  text: TextElement,
  lines: string[],
  fontSize: number,
  scaleX: number,
  scaleY: number,
  canvasWidth: number,
): LineLayout[] {
  const aligned = text.textAlign !== 'none'
  const padding = H_PADDING * scaleX
  const maxWidth = canvasWidth - padding * 2
  const lineHeight = fontSize * 1.2
  const blockY = text.y * scaleY

  const extents = lines.map((line) => measureLineExtents(ctx, line, fontSize))
  const maxContentWidth = Math.max(...extents.map((e) => e.width), 0)

  let blockX = aligned ? padding : text.x * scaleX
  if (aligned) {
    if (text.textAlign === 'center') {
      blockX = padding + (maxWidth - maxContentWidth) / 2
    } else if (text.textAlign === 'right') {
      blockX = canvasWidth - padding - maxContentWidth
    }
  }

  return lines.map((line, index) => {
    const { left, right, width, ascent, descent } = extents[index]
    let x = blockX
    if (aligned && text.textAlign === 'center') {
      x = blockX + (maxContentWidth - width) / 2
    } else if (aligned && text.textAlign === 'right') {
      x = blockX + maxContentWidth - width
    } else if (!aligned) {
      x = text.x * scaleX
    }

    return {
      line,
      x,
      y: blockY + index * lineHeight,
      left,
      right,
      ascent,
      descent,
    }
  })
}

function drawPresetBackground(
  ctx: CanvasRenderingContext2D,
  preset: TextElement['textStylePreset'],
  layouts: LineLayout[],
  fontSize: number,
  scaleX: number,
  scaleY: number,
  backgroundColor: string,
  borderColor: string,
) {
  if (!layouts.length || preset === 'plain' || preset === 'outline') return

  const padX = PRESET_PAD_X * scaleX
  const padY = PRESET_PAD_Y * scaleY
  const textHeight = fontSize * 1.1

  let minX = Infinity
  let maxX = -Infinity
  let minY = layouts[0].y
  let maxY = layouts[0].y + textHeight

  for (const layout of layouts) {
    minX = Math.min(minX, layout.x - layout.left)
    maxX = Math.max(maxX, layout.x + layout.right)
    minY = Math.min(minY, layout.y)
    maxY = Math.max(maxY, layout.y + textHeight)
  }

  const rx = minX - padX
  const ry = minY - padY
  const rw = maxX - minX + padX * 2
  const rh = maxY - minY + padY * 2
  const radius = preset === 'border' ? 6 * scaleX : 2 * scaleX

  if (preset === 'border') {
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2 * scaleX
    drawRoundRect(ctx, rx, ry, rw, rh, radius)
    ctx.stroke()
    return
  }

  if (preset === 'box' || preset === 'box-stroke' || preset === 'fill') {
    ctx.fillStyle = backgroundColor
    drawRoundRect(ctx, rx, ry, rw, rh, radius)
    ctx.fill()

    if (preset === 'box-stroke') {
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 1 * scaleX
      ctx.stroke()
    }
  }
}

function drawTextElement(
  ctx: CanvasRenderingContext2D,
  text: TextElement,
  scaleX: number,
  scaleY: number,
  canvasWidth: number,
) {
  const fontSize = text.fontSize * scaleX
  const fontStyle = text.fontStyle === 'italic' ? 'italic' : 'normal'
  ctx.font = formatCanvasFont(text.fontFamily, fontStyle, text.fontWeight, fontSize)
  ctx.textBaseline = 'top'

  const { color, backgroundColor, borderColor } = resolvePresetColors(text)
  if (!text.content.trim()) return

  const displayWidth = canvasWidth / scaleX
  const maxWrapWidth = getTextWrapMaxWidth(text, displayWidth) * scaleX
  const lines = wrapTextContentToLines(ctx, text.content, maxWrapWidth)

  const layouts = buildLineLayouts(ctx, text, lines, fontSize, scaleX, scaleY, canvasWidth)

  drawPresetBackground(
    ctx,
    text.textStylePreset,
    layouts,
    fontSize,
    scaleX,
    scaleY,
    backgroundColor,
    borderColor,
  )

  layouts.forEach((layout) => {
    if (text.textStylePreset === 'outline') {
      ctx.strokeStyle = color
      ctx.lineWidth = Math.max(2, fontSize * 0.08)
      ctx.lineJoin = 'round'
      ctx.strokeText(layout.line, layout.x, layout.y)
    } else {
      ctx.fillStyle = color
      ctx.fillText(layout.line, layout.x, layout.y)
    }

    drawDecoration(ctx, text, layout, fontSize, color)
  })
}

export async function exportPosterToImage(
  posterUrl: string,
  texts: TextElement[],
  displayWidth: number,
  displayHeight: number,
  imageWidth: number,
  imageHeight: number,
): Promise<Blob> {
  const fontIds = new Set(texts.map((t) => t.fontId))
  const fonts = [...fontIds]
    .map((fontId) => ALL_FONT_OPTIONS.find((f) => f.id === fontId))
    .filter((font): font is (typeof ALL_FONT_OPTIONS)[number] => Boolean(font))
  const sampleByFontId = new Map<string, string>()
  for (const fontId of fontIds) {
    const sample = texts
      .filter((t) => t.fontId === fontId)
      .map((t) => t.content)
      .join('')
    sampleByFontId.set(fontId, sample)
  }
  await ensureFontsReadyForExport(fonts, sampleByFontId)

  const bitmap = await loadOrientedImageBitmap(posterUrl)
  const width = imageWidth
  const height = imageHeight

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')

  try {
    drawPosterBackground(ctx, bitmap, width, height)

    const scaleX = width / displayWidth
    const scaleY = height / displayHeight

    for (const text of texts) {
      drawTextElement(ctx, text, scaleX, scaleY, width)
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1)
    })

    if (blob) return blob

    const dataUrl = canvas.toDataURL('image/png')
    const response = await fetch(dataUrl)
    const fallback = await response.blob()
    if (!fallback.size) throw new Error('导出失败')
    return fallback
  } finally {
    bitmap.close()
  }
}

export async function savePosterBlob(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await Promise.race([
        navigator.share({ files: [file], title: '海报' }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('分享超时')), 12000)
        }),
      ])
      return
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      throw err
    }
  }

  downloadBlob(blob, filename)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
