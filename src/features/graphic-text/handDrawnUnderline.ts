export const HAND_DRAWN_UNDERLINE_VIEWBOX = '0 0 100 20'
export const HAND_DRAWN_UNDERLINE_VIEWBOX_WIDTH = 100
export const HAND_DRAWN_UNDERLINE_VIEWBOX_HEIGHT = 20

/** 完整一段手绘下划线的标准宽度（CSS px） */
export const HAND_DRAWN_UNDERLINE_TILE_WIDTH = 36

export const HAND_DRAWN_UNDERLINE_STROKE_WIDTH = 4

/**
 * 单段手绘荧光笔路径（viewBox 0 0 100 20）：左侧较平，右侧柔和起伏。
 * 使用三次贝塞尔，避免尖角折线。
 */
export const HAND_DRAWN_UNDERLINE_PATH =
  'M 0 13 C 14 13, 28 13, 42 13 C 48 13, 51 9.5, 55 11.2 C 59 13, 61 15, 65 12.2 C 69 9.2, 73 14.2, 77 11.5 C 81 8.8, 85 13.2, 90 12.2 C 94 11.4, 97 12.2, 100 12'

/** 单段 motif 采样点（归一化 x∈[0,1]，y 为 viewBox 高度坐标）——用于按宽度连续铺开 */
const HAND_UNDERLINE_MOTIF_POINTS: Array<[number, number]> = [
  [0, 13],
  [0.14, 13],
  [0.28, 13],
  [0.42, 13],
  [0.5, 10.2],
  [0.58, 14.2],
  [0.66, 9.5],
  [0.74, 13.8],
  [0.82, 10.5],
  [0.9, 13],
  [1, 12],
]

export interface HandUnderlineColorRun {
  start: number
  end: number
  text: string
  color: string
}

/** 将连续且同色的手绘下划线字符合并为单个范围 */
export function buildHandUnderlineColorRuns(
  plain: string,
  blockId: string,
  charOffset: number,
  handUnderlineColorMap: Readonly<Record<string, string>>,
): HandUnderlineColorRun[] {
  const runs: HandUnderlineColorRun[] = []
  let index = 0

  while (index < plain.length) {
    const key = `${blockId}:${charOffset + index}`
    const color = handUnderlineColorMap[key]
    if (!color) {
      index += 1
      continue
    }

    let end = index + 1
    while (end < plain.length) {
      const nextKey = `${blockId}:${charOffset + end}`
      if (handUnderlineColorMap[nextKey] !== color) break
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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function sampleMotifY(t: number) {
  const clamped = Math.min(1, Math.max(0, t))
  const points = HAND_UNDERLINE_MOTIF_POINTS
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x0, y0] = points[index]
    const [x1, y1] = points[index + 1]
    if (clamped <= x1 || index === points.length - 2) {
      const localT = x1 === x0 ? 0 : (clamped - x0) / (x1 - x0)
      return lerp(y0, y1, Math.min(1, Math.max(0, localT)))
    }
  }
  return points[points.length - 1][1]
}

/** Catmull-Rom → 三次贝塞尔，保证整段连续且圆滑 */
function pointsToSmoothPath(points: Array<[number, number]>): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`
  if (points.length === 2) {
    return `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)} L ${points[1][0].toFixed(2)} ${points[1][1].toFixed(2)}`
  }

  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[Math.min(points.length - 1, index + 2)]
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`
  }
  return d
}

/**
 * 按实际选区宽度生成一整条连续手绘线。
 * 以 tileWidth(36px) 为完整周期：18px→前半段，72px→两段平滑衔接。
 */
export function buildContinuousHandUnderlinePath(
  widthPx: number,
  tileWidth = HAND_DRAWN_UNDERLINE_TILE_WIDTH,
): string {
  if (widthPx <= 0) return ''

  const samplesPerTile = 12
  const step = tileWidth / samplesPerTile
  const points: Array<[number, number]> = []

  for (let x = 0; x < widthPx; x += step) {
    const localT = (x % tileWidth) / tileWidth
    points.push([x, sampleMotifY(localT)])
  }

  const endT = (widthPx % tileWidth) / tileWidth
  const endY = sampleMotifY(endT === 0 && widthPx > 0 ? 1 : endT)
  const last = points[points.length - 1]
  if (!last || Math.abs(last[0] - widthPx) > 0.01) {
    points.push([widthPx, endY])
  } else {
    last[0] = widthPx
    last[1] = endY
  }

  return pointsToSmoothPath(points)
}

export function drawHandDrawnUnderline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  color: string,
  lineWidth = HAND_DRAWN_UNDERLINE_STROKE_WIDTH,
  tileWidth = HAND_DRAWN_UNDERLINE_TILE_WIDTH,
) {
  if (width <= 0 || tileWidth <= 0) return

  const pathD = buildContinuousHandUnderlinePath(width, tileWidth)
  if (!pathD) return

  // path 坐标：x 为像素宽度，y 为 viewBox 高度坐标系（约 0–20）
  // 将 path 的 y=13 附近对齐到传入的 baseline underlineY
  const scaleY = Math.max(0.55, lineWidth / HAND_DRAWN_UNDERLINE_STROKE_WIDTH)
  const pathBaseline = 13

  ctx.save()
  ctx.translate(x, y - pathBaseline * scaleY)
  ctx.scale(1, scaleY)
  ctx.strokeStyle = color
  ctx.lineWidth = HAND_DRAWN_UNDERLINE_STROKE_WIDTH
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(new Path2D(pathD))
  ctx.restore()
}
