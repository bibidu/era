export const GRADIENT_OVERLAY_CSS =
  'linear-gradient(135deg, #E0F5F0 0%, #F0F7F5 40%, #F8F6FF 70%, #F0E8FF 100%)'

export const GRADIENT_OVERLAY_STOPS = [
  { offset: 0, color: '#E0F5F0' },
  { offset: 0.4, color: '#F0F7F5' },
  { offset: 0.7, color: '#F8F6FF' },
  { offset: 1, color: '#F0E8FF' },
] as const

export const GRADIENT_OVERLAY_FALLBACK = '#E0F5F0'

export function drawPageGradientBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const radians = (135 * Math.PI) / 180
  const diagonal = Math.sqrt(width * width + height * height)
  const centerX = width / 2
  const centerY = height / 2
  const gradient = ctx.createLinearGradient(
    centerX - Math.cos(radians) * diagonal * 0.5,
    centerY - Math.sin(radians) * diagonal * 0.5,
    centerX + Math.cos(radians) * diagonal * 0.5,
    centerY + Math.sin(radians) * diagonal * 0.5,
  )

  for (const stop of GRADIENT_OVERLAY_STOPS) {
    gradient.addColorStop(stop.offset, stop.color)
  }

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}
