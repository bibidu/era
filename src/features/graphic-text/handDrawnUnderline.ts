export const HAND_DRAWN_UNDERLINE_VIEWBOX = '0 0 100 20'
export const HAND_DRAWN_UNDERLINE_VIEWBOX_WIDTH = 100
export const HAND_DRAWN_UNDERLINE_VIEWBOX_HEIGHT = 20

/** 完整一段手绘下划线的标准宽度（CSS px / 设计稿 px） */
export const HAND_DRAWN_UNDERLINE_TILE_WIDTH = 36

/** 手绘荧光笔下划线：左侧平直，右侧锯齿起伏 */
export const HAND_DRAWN_UNDERLINE_PATH =
  'M 0 13 L 42 13 L 50 9 L 58 15 L 66 8 L 74 14 L 82 10 L 90 13 L 100 12'

export const HAND_DRAWN_UNDERLINE_STROKE_WIDTH = 4

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

  const scaleY = Math.max(0.65, lineWidth / HAND_DRAWN_UNDERLINE_STROKE_WIDTH)
  const path = new Path2D(HAND_DRAWN_UNDERLINE_PATH)
  let offsetX = x
  let remaining = width

  while (remaining > 0) {
    const segmentWidth = Math.min(tileWidth, remaining)
    const visibleFraction = segmentWidth / tileWidth
    const scaleX = tileWidth / HAND_DRAWN_UNDERLINE_VIEWBOX_WIDTH

    ctx.save()
    ctx.translate(offsetX, y)
    ctx.scale(scaleX, scaleY)
    ctx.beginPath()
    ctx.rect(0, 0, HAND_DRAWN_UNDERLINE_VIEWBOX_WIDTH * visibleFraction, HAND_DRAWN_UNDERLINE_VIEWBOX_HEIGHT)
    ctx.clip()
    ctx.strokeStyle = color
    ctx.lineWidth = HAND_DRAWN_UNDERLINE_STROKE_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke(path)
    ctx.restore()

    offsetX += segmentWidth
    remaining -= segmentWidth
  }
}
