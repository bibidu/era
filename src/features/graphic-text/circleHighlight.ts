/** 手绘风格线圈路径（viewBox 0 0 100 56） */
export const HAND_DRAWN_CIRCLE_VIEWBOX = '0 0 100 56'

export const HAND_DRAWN_CIRCLE_PATH =
  'M 14 30 C 6 22, 8 8, 24 5 C 46 2, 72 6, 90 16 C 98 26, 94 42, 76 48 C 52 54, 26 50, 12 38 C 6 32, 8 26, 14 30 Z'

export function handDrawnEllipsePoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  steps = 24,
): Array<[number, number]> {
  const points: Array<[number, number]> = []
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2
    const wobble =
      1 + 0.07 * Math.sin(angle * 3.1 + 0.6) + 0.05 * Math.cos(angle * 4.7 - 0.8)
    points.push([cx + Math.cos(angle) * rx * wobble, cy + Math.sin(angle) * ry * wobble])
  }
  return points
}

export function strokeHandDrawnEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  lineWidth = 4,
) {
  const points = handDrawnEllipsePoints(cx, cy, rx, ry)
  if (points.length < 2) return

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index][0], points[index][1])
  }
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

export function drawHandDrawnCircleAroundTextBounds(
  ctx: CanvasRenderingContext2D,
  x: number,
  yTop: number,
  width: number,
  ascent: number,
  descent: number,
  color: string,
  lineWidth = 4,
) {
  const padX = Math.max(4, width * 0.1)
  const padTop = Math.max(3, ascent * 0.22)
  const padBottom = Math.max(3, descent * 0.35)
  const left = x - padX
  const top = yTop - padTop
  const boxWidth = width + padX * 2
  const boxHeight = ascent + descent + padTop + padBottom
  strokeHandDrawnEllipse(
    ctx,
    left + boxWidth / 2,
    top + boxHeight / 2,
    boxWidth / 2,
    boxHeight / 2,
    color,
    lineWidth,
  )
}
