/** 线网模板：浅灰纸感画布 + 中心薄荷绿几何线网 + 对齐数据点 */

export const WIREMESH_CANVAS_COLOR = '#EEF0F2'

export const WIREMESH_GLOW_COLOR = 'rgba(110, 231, 183, 0.22)'
export const WIREMESH_LINE_COLOR = 'rgba(52, 211, 153, 0.42)'
export const WIREMESH_LINE_SOFT_COLOR = 'rgba(167, 243, 208, 0.28)'
export const WIREMESH_NODE_COLOR = '#34D399'
export const WIREMESH_PIXEL_COLOR = '#6EE7B7'
export const WIREMESH_PIXEL_SOFT_COLOR = 'rgba(52, 211, 153, 0.55)'

export interface WiremeshPoint {
  x: number
  y: number
  /** 距中心归一化距离 0..1+，用于淡出 */
  falloff: number
}

export interface WiremeshEdge {
  a: number
  b: number
  falloff: number
}

export interface WiremeshPixel {
  x: number
  y: number
  size: number
  soft?: boolean
}

/** 线网视觉重心：偏下半屏 */
export const WIREMESH_FOCUS_X = 0.5
export const WIREMESH_FOCUS_Y = 0.7

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function distFromFocus(x: number, y: number) {
  const dx = (x - WIREMESH_FOCUS_X) / 0.48
  const dy = (y - WIREMESH_FOCUS_Y) / 0.42
  return Math.sqrt(dx * dx + dy * dy)
}

/** 确定性抖动，保证预览/导出几何一致 */
function hashNoise(i: number, j: number, salt = 1) {
  const n = Math.sin(i * 127.1 + j * 311.7 + salt * 74.3) * 43758.5453
  return n - Math.floor(n)
}

/**
 * 生成偏疏、重心偏下的三角点阵线网（单位坐标）。
 * 上半屏只留少量延伸，主体集中在下半部分。
 */
export function buildWiremeshGeometry(cols = 7, rows = 9) {
  const points: WiremeshPoint[] = []
  const indexAt: (number | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  )

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const stagger = row % 2 === 0 ? 0 : 0.5
      const t = row / (rows - 1)
      // 行位置压向中下：约 0.38 → 0.92，上半更空
      const baseY = 0.38 + t * t * 0.54
      const baseX = (col + stagger) / (cols - 0.5)
      const jitterX = (hashNoise(col, row, 1) - 0.5) * 0.022
      const jitterY = (hashNoise(col, row, 2) - 0.5) * 0.016
      const pull = 0.06
      const x = clamp01(baseX + jitterX + (WIREMESH_FOCUS_X - baseX) * pull)
      const y = clamp01(baseY + jitterY + (WIREMESH_FOCUS_Y - baseY) * pull * 0.75)

      // 上半再抽稀：y 越靠上越容易丢掉
      if (y < 0.45 && hashNoise(col, row, 7) > 0.28) continue
      if (y < 0.55 && hashNoise(col, row, 8) > 0.55) continue

      const falloff = distFromFocus(x, y)
      if (falloff > 1.18) continue
      indexAt[row][col] = points.length
      points.push({ x, y, falloff })
    }
  }

  const edges: WiremeshEdge[] = []
  const seen = new Set<string>()

  const addEdge = (ai: number | null, bi: number | null, preferDiagonal = false) => {
    if (ai == null || bi == null) return
    const key = ai < bi ? `${ai}-${bi}` : `${bi}-${ai}`
    if (seen.has(key)) return
    const falloff = Math.max(points[ai].falloff, points[bi].falloff)
    if (falloff > 1.12) return
    // 再抽稀连线：对角更少，整体更疏
    const keepChance = preferDiagonal ? 0.42 : 0.72
    if (hashNoise(ai + 1, bi + 1, preferDiagonal ? 11 : 12) > keepChance) return
    seen.add(key)
    edges.push({ a: ai, b: bi, falloff })
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const current = indexAt[row][col]
      if (current == null) continue
      if (col + 1 < cols) addEdge(current, indexAt[row][col + 1])
      if (row + 1 < rows) {
        addEdge(current, indexAt[row + 1][col])
        if (row % 2 === 0) {
          if (col > 0) addEdge(current, indexAt[row + 1][col - 1], true)
        } else if (col + 1 < cols) {
          addEdge(current, indexAt[row + 1][col + 1], true)
        }
      }
    }
  }

  const pixels: WiremeshPixel[] = []
  points.forEach((point, index) => {
    if (point.falloff > 0.95) return
    if (point.y < 0.48) return
    const pick = hashNoise(index, 3, 9)
    if (pick > 0.48) return
    const soft = pick > 0.28
    pixels.push({
      x: point.x,
      y: point.y,
      size: soft ? 0.007 : 0.01 + hashNoise(index, 4, 5) * 0.004,
      soft,
    })
  })

  for (let i = 0; i < edges.length; i += 11) {
    const edge = edges[i]
    if (edge.falloff > 0.75) continue
    const a = points[edge.a]
    const b = points[edge.b]
    const midY = (a.y + b.y) / 2
    if (midY < 0.5) continue
    pixels.push({
      x: (a.x + b.x) / 2,
      y: midY,
      size: 0.0058,
      soft: true,
    })
  }

  return { points, edges, pixels }
}

export const WIREMESH_GEOMETRY = buildWiremeshGeometry()

function lineOpacity(falloff: number) {
  return clamp01(1 - falloff * 0.92) * 0.9
}

function nodeOpacity(falloff: number) {
  return clamp01(1 - falloff * 1.05)
}

export function drawPageWiremeshOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stacked = false,
) {
  if (!stacked) {
    ctx.fillStyle = WIREMESH_CANVAS_COLOR
    ctx.fillRect(0, 0, width, height)

    // 极淡纸纹：细斜线 + 噪点感横纹
    ctx.save()
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.045)'
    ctx.lineWidth = 1
    for (let y = 0; y < height; y += 6) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.03)'
    for (let x = -height; x < width; x += 14) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + height, height)
      ctx.stroke()
    }
    ctx.restore()
  }

  // 偏下半屏的薄荷绿发光底
  const glow = ctx.createRadialGradient(
    width * WIREMESH_FOCUS_X,
    height * WIREMESH_FOCUS_Y,
    0,
    width * WIREMESH_FOCUS_X,
    height * WIREMESH_FOCUS_Y,
    Math.max(width, height) * 0.5,
  )
  glow.addColorStop(0, 'rgba(167, 243, 208, 0.26)')
  glow.addColorStop(0.45, 'rgba(110, 231, 183, 0.1)')
  glow.addColorStop(1, 'rgba(238, 240, 242, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  const { points, edges, pixels } = WIREMESH_GEOMETRY

  // 软光描边层
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const edge of edges) {
    const a = points[edge.a]
    const b = points[edge.b]
    const alpha = lineOpacity(edge.falloff) * 0.55
    if (alpha < 0.02) continue
    ctx.strokeStyle = `rgba(167, 243, 208, ${alpha})`
    ctx.lineWidth = Math.max(1.6, width * 0.0032)
    ctx.beginPath()
    ctx.moveTo(a.x * width, a.y * height)
    ctx.lineTo(b.x * width, b.y * height)
    ctx.stroke()
  }

  // 主线网
  for (const edge of edges) {
    const a = points[edge.a]
    const b = points[edge.b]
    const alpha = lineOpacity(edge.falloff)
    if (alpha < 0.03) continue
    ctx.strokeStyle = `rgba(52, 211, 153, ${alpha * 0.55})`
    ctx.lineWidth = Math.max(1, width * 0.0016)
    ctx.beginPath()
    ctx.moveTo(a.x * width, a.y * height)
    ctx.lineTo(b.x * width, b.y * height)
    ctx.stroke()
  }
  ctx.restore()

  // 顶点微点
  for (const point of points) {
    const alpha = nodeOpacity(point.falloff) * 0.55
    if (alpha < 0.05) continue
    const r = Math.max(1.2, width * 0.0024)
    ctx.fillStyle = `rgba(52, 211, 153, ${alpha})`
    ctx.beginPath()
    ctx.arc(point.x * width, point.y * height, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // 漂浮薄荷绿像素块
  for (const pixel of pixels) {
    const falloff = distFromFocus(pixel.x, pixel.y)
    const alpha = clamp01(1 - falloff * 1.1)
    if (alpha < 0.08) continue
    const size = pixel.size * width
    const x = pixel.x * width - size / 2
    const y = pixel.y * height - size / 2
    ctx.fillStyle = pixel.soft
      ? `rgba(110, 231, 183, ${alpha * 0.7})`
      : `rgba(52, 211, 153, ${alpha * 0.92})`
    ctx.fillRect(x, y, size, size)
  }

  // 边缘再压一层纸色；淡出中心跟随线网重心偏下
  const edgeFade = ctx.createRadialGradient(
    width * WIREMESH_FOCUS_X,
    height * WIREMESH_FOCUS_Y,
    Math.min(width, height) * 0.22,
    width * WIREMESH_FOCUS_X,
    height * WIREMESH_FOCUS_Y,
    Math.max(width, height) * 0.68,
  )
  edgeFade.addColorStop(0, 'rgba(238, 240, 242, 0)')
  edgeFade.addColorStop(0.65, 'rgba(238, 240, 242, 0.16)')
  edgeFade.addColorStop(1, 'rgba(238, 240, 242, 0.78)')
  ctx.fillStyle = edgeFade
  ctx.fillRect(0, 0, width, height)
}
