export const HAND_DRAWN_UNDERLINE_VIEWBOX = '0 0 100 24'
export const HAND_DRAWN_UNDERLINE_VIEWBOX_WIDTH = 100
export const HAND_DRAWN_UNDERLINE_VIEWBOX_HEIGHT = 24

/** 完整一段手绘马克笔下划线的标准宽度（CSS px） */
export const HAND_DRAWN_UNDERLINE_TILE_WIDTH = 36

/** 马克笔风格线宽（相对字符更明显） */
export const HAND_DRAWN_UNDERLINE_STROKE_WIDTH = 5.5

/**
 * 单段手绘马克笔路径（viewBox 0 0 100 24）：
 * 左段平直 → 中段回环 scribble（向右再折回再向前）→ 右段平直。
 * 供 Tab 预览等固定宽度场景使用。
 */
export const HAND_DRAWN_UNDERLINE_PATH =
  'M 0 14 C 18 14, 32 14, 44 14 C 52 14, 58 9, 64 11.5 C 68 13.5, 66 17, 58 16 C 52 15.2, 50 13, 56 12 C 64 10.5, 72 14, 78 14 C 86 14, 94 14, 100 14'

/**
 * 单段 motif 关键点（归一化 x∈[0,1]，y 为 viewBox 高度坐标）。
 * 中段 x 会短暂回退，形成马克笔回环 scribble，而不是上下波浪。
 */
const HAND_UNDERLINE_MOTIF_POINTS: Array<[number, number]> = [
  [0, 14],
  [0.2, 14],
  [0.38, 14],
  [0.48, 14],
  [0.58, 10.5],
  [0.66, 12],
  [0.7, 16],
  [0.58, 16.2], // 回环：向左折回
  [0.5, 14.5],
  [0.5, 12.8],
  [0.62, 12],
  [0.72, 14],
  [0.85, 14],
  [1, 14],
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

/** Catmull-Rom → 三次贝塞尔，保证回环处也圆滑 */
function pointsToSmoothPath(points: Array<[number, number]>): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    return `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`
  }
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

function buildMotifPoints(offsetX: number, tileWidth: number): Array<[number, number]> {
  return HAND_UNDERLINE_MOTIF_POINTS.map(([xNorm, y]) => [offsetX + xNorm * tileWidth, y])
}

/**
 * 按实际选区宽度生成一整条连续马克笔手绘线。
 * 以 tileWidth(36px) 为完整周期：每段含一次回环 scribble；
 * 不足一段时仍画完整 motif，由调用方按宽度裁剪（显示前半段）。
 */
export function buildContinuousHandUnderlinePath(
  widthPx: number,
  tileWidth = HAND_DRAWN_UNDERLINE_TILE_WIDTH,
): string {
  if (widthPx <= 0 || tileWidth <= 0) return ''

  const tileCount = Math.max(1, Math.ceil(widthPx / tileWidth))
  const points: Array<[number, number]> = []

  for (let tile = 0; tile < tileCount; tile += 1) {
    const motif = buildMotifPoints(tile * tileWidth, tileWidth)
    if (tile === 0) {
      points.push(...motif)
      continue
    }
    // 跳过与上一段终点重合的起点，保持单笔连续
    points.push(...motif.slice(1))
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

  const scaleY = Math.max(0.7, lineWidth / HAND_DRAWN_UNDERLINE_STROKE_WIDTH)
  const pathBaseline = 14

  ctx.save()
  ctx.translate(x, y - pathBaseline * scaleY)
  ctx.beginPath()
  ctx.rect(0, -4, width, HAND_DRAWN_UNDERLINE_VIEWBOX_HEIGHT + 8)
  ctx.clip()
  ctx.scale(1, scaleY)
  ctx.strokeStyle = color
  ctx.lineWidth = HAND_DRAWN_UNDERLINE_STROKE_WIDTH
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(new Path2D(pathD))
  ctx.restore()
}
