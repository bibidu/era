export const PIXEL_OVERLAY_COLORS = {
  blue: '#3B82F6',
  purple: '#A855F7',
  green: '#22C55E',
} as const

export interface PixelRect {
  x: number
  y: number
  w: number
  h: number
  color: string
  alpha: number
}

export const PIXEL_OVERLAY_RECTS: PixelRect[] = [
  { x: 0, y: 0.8, w: 0.07, h: 0.07, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.18 },
  { x: 0.03, y: 0.86, w: 0.055, h: 0.055, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.32 },
  { x: 0.07, y: 0.9, w: 0.045, h: 0.045, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.42 },
  { x: 0, y: 0.9, w: 0.035, h: 0.1, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.14 },
  { x: 0.1, y: 0.93, w: 0.03, h: 0.03, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.28 },

  { x: 0.86, y: 0.82, w: 0.14, h: 0.18, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.22 },
  { x: 0.9, y: 0.88, w: 0.1, h: 0.12, color: PIXEL_OVERLAY_COLORS.green, alpha: 0.28 },
  { x: 0.84, y: 0.9, w: 0.07, h: 0.08, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.18 },
  { x: 0.93, y: 0.93, w: 0.05, h: 0.05, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.35 },

  { x: 0.955, y: 0.12, w: 0.045, h: 0.18, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.2 },
  { x: 0.955, y: 0.32, w: 0.045, h: 0.14, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.24 },
  { x: 0.955, y: 0.48, w: 0.045, h: 0.16, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.16 },
  { x: 0.955, y: 0.66, w: 0.045, h: 0.12, color: PIXEL_OVERLAY_COLORS.green, alpha: 0.2 },

  { x: 0.08, y: 0, w: 0.07, h: 0.035, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.16 },
  { x: 0.58, y: 0, w: 0.055, h: 0.03, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.2 },
  { x: 0.74, y: 0.01, w: 0.045, h: 0.028, color: PIXEL_OVERLAY_COLORS.green, alpha: 0.24 },
  { x: 0.18, y: 0.02, w: 0.035, h: 0.025, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.18 },

  { x: 0.04, y: 0.42, w: 0.018, h: 0.05, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.3 },
  { x: 0.72, y: 0.36, w: 0.04, h: 0.018, color: PIXEL_OVERLAY_COLORS.green, alpha: 0.32 },
]

export const PIXEL_HEADER_LINE_Y = [0.072, 0.092, 0.112]
export const PIXEL_DASHED_DIVISIONS = 5
export const PIXEL_DASHED_LINE_COLOR = 'rgba(163, 163, 163, 0.5)'
export const PIXEL_HEADER_LINE_COLOR = 'rgba(163, 163, 163, 0.32)'

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(59, 130, 246, ${alpha})`
  const r = Number.parseInt(normalized.slice(1, 3), 16)
  const g = Number.parseInt(normalized.slice(3, 5), 16)
  const b = Number.parseInt(normalized.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function drawPagePixelOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  for (const rect of PIXEL_OVERLAY_RECTS) {
    ctx.fillStyle = hexToRgba(rect.color, rect.alpha)
    ctx.fillRect(rect.x * width, rect.y * height, rect.w * width, rect.h * height)
  }

  ctx.strokeStyle = PIXEL_HEADER_LINE_COLOR
  ctx.lineWidth = 1
  ctx.setLineDash([])
  for (const y of PIXEL_HEADER_LINE_Y) {
    const lineY = y * height
    ctx.beginPath()
    ctx.moveTo(0, lineY)
    ctx.lineTo(width, lineY)
    ctx.stroke()
  }

  ctx.strokeStyle = PIXEL_DASHED_LINE_COLOR
  ctx.lineWidth = 1
  ctx.setLineDash([8, 8])
  for (let index = 1; index < PIXEL_DASHED_DIVISIONS; index += 1) {
    const x = (index / PIXEL_DASHED_DIVISIONS) * width
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()

    const y = (index / PIXEL_DASHED_DIVISIONS) * height
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  ctx.setLineDash([])
}
