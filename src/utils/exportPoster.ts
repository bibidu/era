import type { TextElement } from '../types'
import { H_PADDING } from '../types'
import { FONT_OPTIONS } from '../data/fonts'
import { ensurePixelFontLoaded, formatCanvasFont } from './pixelFont'
import { resolvePresetColors } from './textLayout'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

function drawDecoration(
  ctx: CanvasRenderingContext2D,
  text: TextElement,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  color: string,
) {
  if (text.textDecoration === 'none') return

  const lineY =
    text.textDecoration === 'underline'
      ? y + fontSize * 1.05
      : y + fontSize * 0.55

  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, fontSize * 0.06)
  ctx.beginPath()
  ctx.moveTo(x, lineY)
  ctx.lineTo(x + width, lineY)
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

function drawPresetBackground(
  ctx: CanvasRenderingContext2D,
  preset: TextElement['textStylePreset'],
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: string,
  borderColor: string,
) {
  const padX = 8
  const padY = 2
  const rx = x - padX
  const ry = y - padY
  const rw = width + padX * 2
  const rh = height + padY * 2

  if (preset === 'border') {
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2
    drawRoundRect(ctx, rx, ry, rw, rh, 6)
    ctx.stroke()
    return
  }

  if (preset === 'box' || preset === 'box-stroke' || preset === 'fill') {
    ctx.fillStyle = backgroundColor
    drawRoundRect(ctx, rx, ry, rw, rh, 2)
    ctx.fill()

    if (preset === 'box-stroke') {
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 1
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
  const aligned = text.textAlign !== 'none'
  const fontSize = text.fontSize * scaleX
  const fontStyle = text.fontStyle === 'italic' ? 'italic' : 'normal'
  ctx.font = formatCanvasFont(text.fontFamily, fontStyle, text.fontWeight, fontSize)
  ctx.textBaseline = 'top'

  const { color, backgroundColor, borderColor } = resolvePresetColors(text)
  const lines = (text.content || '').split('\n')
  if (!text.content.trim()) return
  const lineHeight = fontSize * 1.2
  const padding = H_PADDING * scaleX
  const maxWidth = canvasWidth - padding * 2

  lines.forEach((line, index) => {
    let x = aligned ? padding : text.x * scaleX
    const y = text.y * scaleY + index * lineHeight
    const metrics = ctx.measureText(line)

    if (aligned) {
      if (text.textAlign === 'center') {
        x = padding + (maxWidth - metrics.width) / 2
      } else if (text.textAlign === 'right') {
        x = canvasWidth - padding - metrics.width
      }
    }

    const textHeight = fontSize * 1.1
    drawPresetBackground(
      ctx,
      text.textStylePreset,
      x,
      y,
      metrics.width,
      textHeight,
      backgroundColor,
      borderColor,
    )

    if (text.textStylePreset === 'outline') {
      ctx.strokeStyle = color
      ctx.lineWidth = Math.max(2, fontSize * 0.08)
      ctx.lineJoin = 'round'
      ctx.strokeText(line, x, y)
    } else {
      ctx.fillStyle = color
      ctx.fillText(line, x, y)
    }

    drawDecoration(ctx, text, x, y, metrics.width, fontSize, color)
  })
}

export async function exportPosterToImage(
  posterUrl: string,
  texts: TextElement[],
  containerWidth: number,
  containerHeight: number,
): Promise<Blob> {
  const fontIds = new Set(texts.map((t) => t.fontId))
  await Promise.all(
    [...fontIds].map(async (fontId) => {
      const font = FONT_OPTIONS.find((f) => f.id === fontId)
      if (font?.source === 'pixel') await ensurePixelFontLoaded(font)
    }),
  )
  await document.fonts.ready

  const img = await loadImage(posterUrl)
  const scale = 2
  const width = Math.round(containerWidth * scale)
  const height = Math.round(containerHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')

  ctx.drawImage(img, 0, 0, width, height)

  const scaleX = width / containerWidth
  const scaleY = height / containerHeight

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
}

export async function savePosterBlob(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '海报' })
      return
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
    }
  }

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
