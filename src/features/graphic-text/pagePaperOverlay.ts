export const PAPER_NOISE_OPACITY = 0.16

interface PaperDashSegment {
  points: { x: number; y: number }[]
  alpha: number
  width: number
  dash: string
  gap: string
}

function paperHash(seed: number) {
  const value = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function clamp01(value: number) {
  return Math.max(0.02, Math.min(0.98, value))
}

function buildPaperDashSegments(count = 46): PaperDashSegment[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1
    const pointCount = 2 + Math.floor(paperHash(seed * 1.9) * 4)
    const points: { x: number; y: number }[] = []
    let x = paperHash(seed * 2.4)
    let y = paperHash(seed * 3.1)

    for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
      if (pointIndex > 0 && paperHash(seed * 4.8 + pointIndex) > 0.72) {
        points.push({ x: NaN, y: NaN })
      }
      points.push({ x: clamp01(x), y: clamp01(y) })
      const step = 0.12 + paperHash(seed * 5.2 + pointIndex) * 0.42
      const angle = paperHash(seed * 6.7 + pointIndex) * Math.PI * 2
      x += Math.cos(angle) * step
      y += Math.sin(angle) * step
    }

    return {
      points,
      alpha: 0.08 + paperHash(seed * 7.4) * 0.14,
      width: 0.32 + paperHash(seed * 8.1) * 0.5,
      dash: `${0.012 + paperHash(seed * 9.2) * 0.02}`,
      gap: `${0.01 + paperHash(seed * 10.3) * 0.025}`,
    }
  })
}

export const PAPER_DASH_SEGMENTS = buildPaperDashSegments()

function fillPaperGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  alpha: number,
) {
  const scale = 3
  const grainWidth = Math.max(1, Math.ceil(width / scale))
  const grainHeight = Math.max(1, Math.ceil(height / scale))
  const imageData = ctx.createImageData(grainWidth, grainHeight)
  const { data } = imageData

  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4
    const noise = paperHash(pixel * 0.17)
    const tone = 126 + (noise - 0.5) * 22
    data[index] = tone
    data[index + 1] = tone
    data[index + 2] = tone
    data[index + 3] = Math.round(alpha * 255)
  }

  const grainCanvas = document.createElement('canvas')
  grainCanvas.width = grainWidth
  grainCanvas.height = grainHeight
  const grainCtx = grainCanvas.getContext('2d')
  if (!grainCtx) return

  grainCtx.putImageData(imageData, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(grainCanvas, 0, 0, width, height)
}

function drawDashSegment(
  ctx: CanvasRenderingContext2D,
  segment: PaperDashSegment,
  width: number,
  height: number,
) {
  ctx.strokeStyle = `rgba(126, 124, 118, ${segment.alpha})`
  ctx.lineWidth = segment.width
  ctx.setLineDash([
    Number.parseFloat(segment.dash) * width,
    Number.parseFloat(segment.gap) * width,
  ])
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  let drawing = false
  ctx.beginPath()
  for (const point of segment.points) {
    if (Number.isNaN(point.x) || Number.isNaN(point.y)) {
      if (drawing) ctx.stroke()
      ctx.beginPath()
      drawing = false
      continue
    }
    const px = point.x * width
    const py = point.y * height
    if (!drawing) {
      ctx.moveTo(px, py)
      drawing = true
    } else {
      ctx.lineTo(px, py)
    }
  }
  if (drawing) ctx.stroke()
  ctx.setLineDash([])
}

export function drawPagePaperOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  fillPaperGrain(ctx, width, height, PAPER_NOISE_OPACITY)
  ctx.restore()

  for (const segment of PAPER_DASH_SEGMENTS) {
    drawDashSegment(ctx, segment, width, height)
  }
}

function segmentPath(segment: PaperDashSegment) {
  let path = ''
  let open = false
  for (const point of segment.points) {
    if (Number.isNaN(point.x) || Number.isNaN(point.y)) {
      open = false
      continue
    }
    if (!open) {
      path += `M ${point.x} ${point.y} `
      open = true
    } else {
      path += `L ${point.x} ${point.y} `
    }
  }
  return path.trim()
}

export function paperDashPath(segment: PaperDashSegment) {
  return segmentPath(segment)
}

export function paperDashStroke(segment: PaperDashSegment) {
  return `rgba(126, 124, 118, ${segment.alpha})`
}

export function paperDashDashArray(segment: PaperDashSegment) {
  return `${segment.dash} ${segment.gap}`
}

export const PAPER_PREVIEW_DASHES = PAPER_DASH_SEGMENTS.slice(0, 14)
