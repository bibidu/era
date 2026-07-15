export const PAPER_WARM_IVORY = '#F7F2E8'
export const PAPER_WARM_WASH = 'rgba(232, 214, 188, 0.14)'
export const PAPER_VIGNETTE = 'rgba(198, 176, 142, 0.1)'

interface PaperSpeckle {
  x: number
  y: number
  radius: number
  alpha: number
}

interface PaperScratch {
  x1: number
  y1: number
  x2: number
  y2: number
  alpha: number
  width: number
}

export interface PaperFiberLine {
  points: { x: number; y: number }[]
  alpha: number
  width: number
  tone: 'gray' | 'warm'
}

function paperHash(seed: number) {
  const value = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function clamp01(value: number) {
  return Math.max(0.015, Math.min(0.985, value))
}

function buildPaperSpeckles(count = 48): PaperSpeckle[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1
    return {
      x: paperHash(seed * 1.7),
      y: paperHash(seed * 2.3),
      radius: 0.0008 + paperHash(seed * 3.1) * 0.0018,
      alpha: 0.04 + paperHash(seed * 4.9) * 0.1,
    }
  })
}

function buildPaperScratches(count = 16): PaperScratch[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 11
    const x1 = paperHash(seed * 5.2)
    const y1 = paperHash(seed * 6.4)
    const angle = paperHash(seed * 7.8) * Math.PI * 2
    const length = 0.05 + paperHash(seed * 8.2) * 0.16
    return {
      x1,
      y1,
      x2: clamp01(x1 + Math.cos(angle) * length),
      y2: clamp01(y1 + Math.sin(angle) * length),
      alpha: 0.05 + paperHash(seed * 9.1) * 0.1,
      width: 0.3 + paperHash(seed * 10.4) * 0.55,
    }
  })
}

function buildPaperFiberLines(count = 34): PaperFiberLine[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 61
    const pointCount = 3 + Math.floor(paperHash(seed * 1.3) * 5)
    const points: { x: number; y: number }[] = []
    let x = paperHash(seed * 2.1)
    let y = paperHash(seed * 3.4)

    for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
      points.push({ x: clamp01(x), y: clamp01(y) })
      x += (paperHash(seed * 4.2 + pointIndex) - 0.5) * 0.18
      y += (paperHash(seed * 5.6 + pointIndex) - 0.5) * 0.12
    }

    return {
      points,
      alpha: 0.07 + paperHash(seed * 6.8) * 0.14,
      width: 0.28 + paperHash(seed * 7.9) * 0.42,
      tone: paperHash(seed * 8.7) > 0.28 ? 'gray' : 'warm',
    }
  })
}

export const PAPER_SPECKLES = buildPaperSpeckles()
export const PAPER_SCRATCHES = buildPaperScratches()
export const PAPER_FIBER_LINES = buildPaperFiberLines()

function fiberStroke(tone: PaperFiberLine['tone'], alpha: number) {
  return tone === 'gray'
    ? `rgba(126, 124, 118, ${alpha})`
    : `rgba(142, 124, 98, ${alpha})`
}

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
    const x = pixel % grainWidth
    const y = Math.floor(pixel / grainWidth)
    const noise = paperHash(pixel * 0.17 + x * 0.31 + y * 0.53)
    const warm = 236 + (noise - 0.5) * 18
    data[index] = warm + 6
    data[index + 1] = warm + 1
    data[index + 2] = warm - 10
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

function drawFiberLine(
  ctx: CanvasRenderingContext2D,
  line: PaperFiberLine,
  width: number,
  height: number,
) {
  if (line.points.length < 2) return

  ctx.strokeStyle = fiberStroke(line.tone, line.alpha)
  ctx.lineWidth = line.width
  ctx.beginPath()
  ctx.moveTo(line.points[0].x * width, line.points[0].y * height)

  for (let index = 1; index < line.points.length; index += 1) {
    const previous = line.points[index - 1]
    const current = line.points[index]
    const controlX = ((previous.x + current.x) / 2) * width
    const controlY = ((previous.y + current.y) / 2) * height
    ctx.quadraticCurveTo(
      controlX,
      controlY,
      current.x * width,
      current.y * height,
    )
  }

  ctx.stroke()
}

export function drawPagePaperOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.max(width, height) * 0.78

  const wash = ctx.createRadialGradient(centerX, centerY, radius * 0.12, centerX, centerY, radius)
  wash.addColorStop(0, 'rgba(255, 248, 236, 0)')
  wash.addColorStop(0.72, PAPER_WARM_WASH)
  wash.addColorStop(1, PAPER_VIGNETTE)
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  fillPaperGrain(ctx, width, height, 0.2)
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = 'soft-light'
  fillPaperGrain(ctx, width, height, 0.12)
  ctx.restore()

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const line of PAPER_FIBER_LINES) {
    drawFiberLine(ctx, line, width, height)
  }

  for (const speckle of PAPER_SPECKLES) {
    ctx.fillStyle = `rgba(118, 98, 72, ${speckle.alpha})`
    ctx.beginPath()
    ctx.arc(speckle.x * width, speckle.y * height, speckle.radius * width, 0, Math.PI * 2)
    ctx.fill()
  }

  for (const scratch of PAPER_SCRATCHES) {
    ctx.strokeStyle = `rgba(132, 126, 116, ${scratch.alpha})`
    ctx.lineWidth = scratch.width
    ctx.beginPath()
    ctx.moveTo(scratch.x1 * width, scratch.y1 * height)
    ctx.lineTo(scratch.x2 * width, scratch.y2 * height)
    ctx.stroke()
  }
}

function fiberPointsToPath(points: PaperFiberLine['points']) {
  if (points.length < 2) return ''
  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    path += ` Q ${(previous.x + current.x) / 2} ${(previous.y + current.y) / 2} ${current.x} ${current.y}`
  }
  return path
}

export function paperFiberPath(line: PaperFiberLine) {
  return fiberPointsToPath(line.points)
}

export function paperFiberStroke(line: PaperFiberLine) {
  return fiberStroke(line.tone, line.alpha)
}
