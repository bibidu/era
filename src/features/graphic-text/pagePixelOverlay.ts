export const PIXEL_OVERLAY_COLORS = {
  blue: '#3B82F6',
  purple: '#A855F7',
  green: '#22C55E',
} as const

export interface PixelRect {
  x: number
  y: number
  size: number
  color: string
  alpha: number
}

const S = 0.028

/** Square tiles only; adjacent tiles alternate color and alpha. */
export const PIXEL_OVERLAY_RECTS: PixelRect[] = [
  { x: 0.01, y: 0.91, size: S, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.22 },
  { x: 0.01 + S, y: 0.91, size: S, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.26 },
  { x: 0.01, y: 0.91 + S, size: S, color: PIXEL_OVERLAY_COLORS.green, alpha: 0.3 },
  { x: 0.01 + S, y: 0.91 + S, size: S, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.36 },
  { x: 0.01 + S * 2, y: 0.91 + S, size: S, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.18 },

  { x: 0.91, y: 0.9, size: S, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.24 },
  { x: 0.91 + S, y: 0.9, size: S, color: PIXEL_OVERLAY_COLORS.green, alpha: 0.3 },
  { x: 0.91, y: 0.9 + S, size: S, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.2 },
  { x: 0.91 + S, y: 0.9 + S, size: S, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.34 },
  { x: 0.91 + S * 2, y: 0.9 + S, size: S, color: PIXEL_OVERLAY_COLORS.green, alpha: 0.26 },

  { x: 0.966, y: 0.14, size: S, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.22 },
  { x: 0.966, y: 0.14 + S, size: S, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.28 },
  { x: 0.966, y: 0.14 + S * 2, size: S, color: PIXEL_OVERLAY_COLORS.green, alpha: 0.2 },
  { x: 0.966, y: 0.14 + S * 3, size: S, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.16 },
  { x: 0.966, y: 0.14 + S * 4, size: S, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.24 },
  { x: 0.966, y: 0.14 + S * 5, size: S, color: PIXEL_OVERLAY_COLORS.green, alpha: 0.18 },

  { x: 0.06, y: 0.01, size: S, color: PIXEL_OVERLAY_COLORS.blue, alpha: 0.18 },
  { x: 0.06 + S, y: 0.01, size: S, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.22 },
  { x: 0.56, y: 0.01, size: S, color: PIXEL_OVERLAY_COLORS.green, alpha: 0.2 },
  { x: 0.56 + S, y: 0.01, size: S, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.26 },

  { x: 0.03, y: 0.42, size: S * 0.72, color: PIXEL_OVERLAY_COLORS.purple, alpha: 0.3 },
  { x: 0.72, y: 0.36, size: S * 0.78, color: PIXEL_OVERLAY_COLORS.green, alpha: 0.32 },
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
    const pixelSize = rect.size * width
    ctx.fillRect(rect.x * width, rect.y * height, pixelSize, pixelSize)
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
