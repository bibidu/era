export const PAPER_WARM_IVORY = '#F7F2E8'
export const PAPER_WARM_WASH = 'rgba(232, 214, 188, 0.14)'
export const PAPER_VIGNETTE = 'rgba(198, 176, 142, 0.1)'
export const PAPER_SPECKLE_COLOR = 'rgba(118, 98, 72, 0.22)'
export const PAPER_SCRATCH_COLOR = 'rgba(142, 124, 98, 0.12)'

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

function paperHash(seed: number) {
  const value = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function buildPaperSpeckles(count = 42): PaperSpeckle[] {
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

function buildPaperScratches(count = 9): PaperScratch[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 11
    const x1 = paperHash(seed * 5.2)
    const y1 = paperHash(seed * 6.4)
    const angle = paperHash(seed * 7.8) * Math.PI
    const length = 0.04 + paperHash(seed * 8.2) * 0.12
    return {
      x1,
      y1,
      x2: x1 + Math.cos(angle) * length,
      y2: y1 + Math.sin(angle) * length,
      alpha: 0.05 + paperHash(seed * 9.1) * 0.08,
      width: 0.35 + paperHash(seed * 10.4) * 0.45,
    }
  })
}

export const PAPER_SPECKLES = buildPaperSpeckles()
export const PAPER_SCRATCHES = buildPaperScratches()

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

  for (const speckle of PAPER_SPECKLES) {
    ctx.fillStyle = `rgba(118, 98, 72, ${speckle.alpha})`
    ctx.beginPath()
    ctx.arc(speckle.x * width, speckle.y * height, speckle.radius * width, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.lineCap = 'round'
  for (const scratch of PAPER_SCRATCHES) {
    ctx.strokeStyle = `rgba(142, 124, 98, ${scratch.alpha})`
    ctx.lineWidth = scratch.width
    ctx.beginPath()
    ctx.moveTo(scratch.x1 * width, scratch.y1 * height)
    ctx.lineTo(scratch.x2 * width, scratch.y2 * height)
    ctx.stroke()
  }
}
