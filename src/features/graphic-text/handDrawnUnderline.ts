export const HAND_DRAWN_UNDERLINE_VIEWBOX = '0 0 100 20'

/** 手绘荧光笔下划线：左侧平直，右侧锯齿起伏 */
export const HAND_DRAWN_UNDERLINE_PATH =
  'M 0 13 L 42 13 L 50 9 L 58 15 L 66 8 L 74 14 L 82 10 L 90 13 L 100 12'

export const HAND_DRAWN_UNDERLINE_STROKE_WIDTH = 4

export function drawHandDrawnUnderline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  color: string,
  lineWidth = HAND_DRAWN_UNDERLINE_STROKE_WIDTH,
) {
  if (width <= 0) return

  const scaleX = width / 100
  const scaleY = Math.max(0.65, lineWidth / HAND_DRAWN_UNDERLINE_STROKE_WIDTH)

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scaleX, scaleY)
  ctx.strokeStyle = color
  ctx.lineWidth = HAND_DRAWN_UNDERLINE_STROKE_WIDTH
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(new Path2D(HAND_DRAWN_UNDERLINE_PATH))
  ctx.restore()
}
