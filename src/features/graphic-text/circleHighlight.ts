/** 与预览 CSS `.graphic-circle-highlight-svg` 一致的 padding（em 单位） */
export const HAND_DRAWN_CIRCLE_PAD_LEFT_EM = 0.58
export const HAND_DRAWN_CIRCLE_PAD_TOP_EM = 0.46
export const HAND_DRAWN_CIRCLE_PAD_WIDTH_EXTRA_EM = 1.16
export const HAND_DRAWN_CIRCLE_PAD_HEIGHT_EXTRA_EM = 0.92
export const HAND_DRAWN_CIRCLE_STROKE_WIDTH = 4

export const HAND_DRAWN_CIRCLE_VIEWBOX_WIDTH = 100
export const HAND_DRAWN_CIRCLE_VIEWBOX_HEIGHT = 56

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
  fontSize: number,
  lineWidth = HAND_DRAWN_CIRCLE_STROKE_WIDTH,
) {
  const em = fontSize
  const boxLeft = x - em * HAND_DRAWN_CIRCLE_PAD_LEFT_EM
  const boxTop = yTop - em * HAND_DRAWN_CIRCLE_PAD_TOP_EM
  const boxWidth = width + em * HAND_DRAWN_CIRCLE_PAD_WIDTH_EXTRA_EM
  const boxHeight = ascent + descent + em * HAND_DRAWN_CIRCLE_PAD_HEIGHT_EXTRA_EM
  const scaleX = boxWidth / HAND_DRAWN_CIRCLE_VIEWBOX_WIDTH
  const scaleY = boxHeight / HAND_DRAWN_CIRCLE_VIEWBOX_HEIGHT

  ctx.save()
  ctx.translate(boxLeft, boxTop)
  ctx.scale(scaleX, scaleY)
  const path = new Path2D(HAND_DRAWN_CIRCLE_PATH)
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth / Math.max(scaleX, scaleY)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(path)
  ctx.restore()
}

export interface CircleHighlightRun {
  start: number
  end: number
  text: string
}

export interface CircleHighlightColorRun {
  start: number
  end: number
  text: string
  color: string
}

/** 在同一渲染行内，将连续且同色线圈高亮字符合并为单个线圈范围 */
export function buildCircleHighlightColorRuns(
  plain: string,
  blockId: string,
  charOffset: number,
  circleColorMap: Readonly<Record<string, string>>,
): CircleHighlightColorRun[] {
  const runs: CircleHighlightColorRun[] = []
  let index = 0

  while (index < plain.length) {
    const key = `${blockId}:${charOffset + index}`
    const color = circleColorMap[key]
    if (!color) {
      index += 1
      continue
    }

    let end = index + 1
    while (end < plain.length) {
      const nextKey = `${blockId}:${charOffset + end}`
      if (circleColorMap[nextKey] !== color) break
      end += 1
    }

    runs.push({
      start: index,
      end,
      text: plain.slice(index, end),
      color,
    })
    index = end
  }

  return runs
}

/** @deprecated Use buildCircleHighlightColorRuns for per-character colors. */
export function buildCircleHighlightRuns(
  plain: string,
  blockId: string,
  charOffset: number,
  circleKeys: ReadonlySet<string>,
): CircleHighlightRun[] {
  const runs: CircleHighlightRun[] = []
  let index = 0

  while (index < plain.length) {
    if (!circleKeys.has(`${blockId}:${charOffset + index}`)) {
      index += 1
      continue
    }

    let end = index
    while (end < plain.length && circleKeys.has(`${blockId}:${charOffset + end}`)) {
      end += 1
    }

    runs.push({
      start: index,
      end,
      text: plain.slice(index, end),
    })
    index = end
  }

  return runs
}
