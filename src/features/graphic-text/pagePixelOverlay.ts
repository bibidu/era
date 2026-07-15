export const PIXEL_CANVAS_COLOR = '#FAFBFC'

export const PIXEL_GRID_DIVISIONS = 12
export const PIXEL_GRID_LINE_COLOR = 'rgba(203, 213, 225, 0.42)'
export const PIXEL_GRID_ACCENT_COLOR = 'rgba(148, 163, 184, 0.28)'
export const PIXEL_HEADER_LINE_COLOR = 'rgba(186, 196, 210, 0.55)'
export const PIXEL_HEADER_LINE_Y = [0.074, 0.094]

export interface PixelGlassShape {
  x: number
  y: number
  width: number
  height: number
  radius: number
  fill: string
  stroke: string
  strokeWidth?: number
}

export const PIXEL_GLASS_SHAPES: PixelGlassShape[] = [
  {
    x: 0.04,
    y: 0.05,
    width: 0.18,
    height: 0.09,
    radius: 0.014,
    fill: 'rgba(255, 255, 255, 0.58)',
    stroke: 'rgba(226, 232, 240, 0.82)',
  },
  {
    x: 0.66,
    y: 0.06,
    width: 0.28,
    height: 0.12,
    radius: 0.018,
    fill: 'rgba(255, 255, 255, 0.48)',
    stroke: 'rgba(203, 213, 225, 0.72)',
  },
  {
    x: 0.03,
    y: 0.84,
    width: 0.11,
    height: 0.07,
    radius: 0.012,
    fill: 'rgba(34, 211, 238, 0.14)',
    stroke: 'rgba(34, 211, 238, 0.28)',
  },
  {
    x: 0.14,
    y: 0.87,
    width: 0.08,
    height: 0.055,
    radius: 0.01,
    fill: 'rgba(167, 139, 250, 0.13)',
    stroke: 'rgba(167, 139, 250, 0.26)',
  },
  {
    x: 0.22,
    y: 0.845,
    width: 0.055,
    height: 0.04,
    radius: 0.008,
    fill: 'rgba(59, 130, 246, 0.12)',
    stroke: 'rgba(59, 130, 246, 0.22)',
  },
  {
    x: 0.74,
    y: 0.36,
    width: 0.09,
    height: 0.055,
    radius: 0.011,
    fill: 'rgba(34, 211, 238, 0.11)',
    stroke: 'rgba(34, 211, 238, 0.22)',
  },
  {
    x: 0.84,
    y: 0.72,
    width: 0.07,
    height: 0.05,
    radius: 0.009,
    fill: 'rgba(167, 139, 250, 0.12)',
    stroke: 'rgba(167, 139, 250, 0.24)',
  },
  {
    x: 0.58,
    y: 0.78,
    width: 0.1,
    height: 0.06,
    radius: 0.012,
    fill: 'rgba(255, 255, 255, 0.42)',
    stroke: 'rgba(191, 219, 254, 0.55)',
  },
]

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawBlueprintGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.lineWidth = 1
  ctx.setLineDash([])

  for (let index = 1; index < PIXEL_GRID_DIVISIONS; index += 1) {
    const ratio = index / PIXEL_GRID_DIVISIONS
    const major = index % 4 === 0
    ctx.strokeStyle = major ? PIXEL_GRID_ACCENT_COLOR : PIXEL_GRID_LINE_COLOR
    const x = ratio * width
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()

    const y = ratio * height
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

export function drawPagePixelOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.fillStyle = PIXEL_CANVAS_COLOR
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(
    width * 0.82,
    height * 0.14,
    0,
    width * 0.82,
    height * 0.14,
    Math.max(width, height) * 0.42,
  )
  glow.addColorStop(0, 'rgba(59, 130, 246, 0.14)')
  glow.addColorStop(0.45, 'rgba(34, 211, 238, 0.06)')
  glow.addColorStop(1, 'rgba(250, 251, 252, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  const violetGlow = ctx.createRadialGradient(
    width * 0.12,
    height * 0.88,
    0,
    width * 0.12,
    height * 0.88,
    Math.max(width, height) * 0.28,
  )
  violetGlow.addColorStop(0, 'rgba(167, 139, 250, 0.1)')
  violetGlow.addColorStop(1, 'rgba(250, 251, 252, 0)')
  ctx.fillStyle = violetGlow
  ctx.fillRect(0, 0, width, height)

  drawBlueprintGrid(ctx, width, height)

  ctx.strokeStyle = PIXEL_HEADER_LINE_COLOR
  ctx.lineWidth = 1
  for (const y of PIXEL_HEADER_LINE_Y) {
    const lineY = y * height
    ctx.beginPath()
    ctx.moveTo(0, lineY)
    ctx.lineTo(width, lineY)
    ctx.stroke()
  }

  for (const shape of PIXEL_GLASS_SHAPES) {
    const x = shape.x * width
    const y = shape.y * height
    const shapeWidth = shape.width * width
    const shapeHeight = shape.height * height
    const radius = shape.radius * width

    roundRectPath(ctx, x, y, shapeWidth, shapeHeight, radius)
    ctx.fillStyle = shape.fill
    ctx.fill()
    ctx.strokeStyle = shape.stroke
    ctx.lineWidth = shape.strokeWidth ?? 1
    ctx.stroke()
  }
}
