/** 线网模板：浅灰纸感画布 + 薄荷绿几何线网（约 75% 区域，上淡下深） */

/** 整体再淡约 50%：网线/光晕透明度倍率 */
export const WIREMESH_FADE = 0.5

/** 浅灰纸底（相对原 #EEF0F2 再靠白约一半） */
export const WIREMESH_CANVAS_COLOR = '#F7F8F9'

export const WIREMESH_GLOW_COLOR = `rgba(110, 231, 183, ${0.22 * WIREMESH_FADE})`
export const WIREMESH_LINE_COLOR = `rgba(52, 211, 153, ${0.42 * WIREMESH_FADE})`
export const WIREMESH_LINE_SOFT_COLOR = `rgba(167, 243, 208, ${0.28 * WIREMESH_FADE})`
export const WIREMESH_NODE_COLOR = '#34D399'
export const WIREMESH_PIXEL_COLOR = '#6EE7B7'
export const WIREMESH_PIXEL_SOFT_COLOR = `rgba(52, 211, 153, ${0.55 * WIREMESH_FADE})`

/** 边缘淡出用的纸色 RGB，与 WIREMESH_CANVAS_COLOR 对齐 */
export const WIREMESH_CANVAS_RGB = '247, 248, 249'

export interface WiremeshPoint {
  x: number
  y: number
  /** 距焦点归一化距离 0..1+，用于边缘淡出 */
  falloff: number
}

export interface WiremeshEdge {
  a: number
  b: number
  falloff: number
  /** 边中点 y，用于上淡下深 */
  midY: number
}

export interface WiremeshPixel {
  x: number
  y: number
  size: number
  soft?: boolean
}

/** 覆盖约 75% 画布：焦点略偏下，半径够大 */
export const WIREMESH_FOCUS_X = 0.5
export const WIREMESH_FOCUS_Y = 0.58

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function distFromFocus(x: number, y: number) {
  // 椭圆覆盖约 3/4 区域；横向略宽、纵向略高
  const dx = (x - WIREMESH_FOCUS_X) / 0.62
  const dy = (y - WIREMESH_FOCUS_Y) / 0.68
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 纵向深度：上半淡但仍可见，下半更深。
 * y=0.12 → ~0.40，y=0.5 → ~0.74，y=0.88 → ~1.0
 */
export function verticalStrength(y: number) {
  return clamp01(0.36 + Math.pow(clamp01((y - 0.06) / 0.86), 1.05) * 0.64)
}

/** 综合透明度：径向覆盖 × 上淡下深 × 整体淡化 */
export function meshOpacity(falloff: number, y: number, base = 1) {
  const radial = clamp01(1 - falloff * 0.88)
  return radial * verticalStrength(y) * base * WIREMESH_FADE
}

/** 确定性抖动，保证预览/导出几何一致 */
function hashNoise(i: number, j: number, salt = 1) {
  const n = Math.sin(i * 127.1 + j * 311.7 + salt * 74.3) * 43758.5453
  return n - Math.floor(n)
}

/**
 * 中等密度三角点阵，铺满约 75% 区域。
 * 疏密靠透明度的上淡下深表现，而不是大幅抽点。
 */
export function buildWiremeshGeometry(cols = 12, rows = 16) {
  const points: WiremeshPoint[] = []
  const indexAt: (number | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  )

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const stagger = row % 2 === 0 ? 0 : 0.5
      const t = row / (rows - 1)
      // 覆盖约 y=0.08 → 0.95
      const baseY = 0.08 + t * 0.87
      const baseX = (col + stagger) / (cols - 0.5)
      const jitterX = (hashNoise(col, row, 1) - 0.5) * 0.012
      const jitterY = (hashNoise(col, row, 2) - 0.5) * 0.01
      const pull = 0.03
      const x = clamp01(baseX + jitterX + (WIREMESH_FOCUS_X - baseX) * pull)
      const y = clamp01(baseY + jitterY + (WIREMESH_FOCUS_Y - baseY) * pull * 0.4)

      const falloff = distFromFocus(x, y)
      if (falloff > 1.08) continue
      indexAt[row][col] = points.length
      points.push({ x, y, falloff })
    }
  }

  const edges: WiremeshEdge[] = []
  const seen = new Set<string>()

  const addEdge = (ai: number | null, bi: number | null, diagonal = false) => {
    if (ai == null || bi == null) return
    const key = ai < bi ? `${ai}-${bi}` : `${bi}-${ai}`
    if (seen.has(key)) return
    const falloff = Math.max(points[ai].falloff, points[bi].falloff)
    if (falloff > 1.05) return
    const keepChance = diagonal ? 0.88 : 0.98
    if (hashNoise(ai + 1, bi + 1, diagonal ? 11 : 12) > keepChance) return
    seen.add(key)
    const midY = (points[ai].y + points[bi].y) / 2
    edges.push({ a: ai, b: bi, falloff, midY })
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
    if (point.falloff > 1.0) return
    const pick = hashNoise(index, 3, 9)
    const threshold = point.y < 0.35 ? 0.42 : point.y < 0.55 ? 0.55 : 0.68
    if (pick > threshold) return
    const soft = pick > threshold * 0.55
    pixels.push({
      x: point.x,
      y: point.y,
      size: soft ? 0.006 : 0.0085 + hashNoise(index, 4, 5) * 0.0035,
      soft,
    })
  })

  for (let i = 0; i < edges.length; i += 6) {
    const edge = edges[i]
    if (edge.falloff > 0.95) continue
    const a = points[edge.a]
    const b = points[edge.b]
    pixels.push({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      size: 0.0055,
      soft: true,
    })
  }

  return { points, edges, pixels }
}

export const WIREMESH_GEOMETRY = buildWiremeshGeometry()

export function lineOpacity(falloff: number, midY: number) {
  return meshOpacity(falloff, midY, 1.05)
}

export function nodeOpacity(falloff: number, y: number) {
  return meshOpacity(falloff, y, 0.78)
}

export function pixelOpacity(falloff: number, y: number) {
  return meshOpacity(falloff, y, 1.05)
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

    ctx.save()
    ctx.strokeStyle = `rgba(148, 163, 184, ${0.045 * WIREMESH_FADE})`
    ctx.lineWidth = 1
    for (let y = 0; y < height; y += 6) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.strokeStyle = `rgba(148, 163, 184, ${0.03 * WIREMESH_FADE})`
    for (let x = -height; x < width; x += 14) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + height, height)
      ctx.stroke()
    }
    ctx.restore()
  }

  // 大范围薄荷绿光晕，略偏下、覆盖约 75%
  const glow = ctx.createRadialGradient(
    width * WIREMESH_FOCUS_X,
    height * WIREMESH_FOCUS_Y,
    0,
    width * WIREMESH_FOCUS_X,
    height * WIREMESH_FOCUS_Y,
    Math.max(width, height) * 0.62,
  )
  glow.addColorStop(0, `rgba(167, 243, 208, ${0.22 * WIREMESH_FADE})`)
  glow.addColorStop(0.5, `rgba(110, 231, 183, ${0.09 * WIREMESH_FADE})`)
  glow.addColorStop(1, `rgba(${WIREMESH_CANVAS_RGB}, 0)`)
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  // 额外一层自上而下的淡→深，强化下半更深
  const verticalWash = ctx.createLinearGradient(0, 0, 0, height)
  verticalWash.addColorStop(0, `rgba(167, 243, 208, ${0.02 * WIREMESH_FADE})`)
  verticalWash.addColorStop(0.35, `rgba(167, 243, 208, ${0.04 * WIREMESH_FADE})`)
  verticalWash.addColorStop(0.7, `rgba(110, 231, 183, ${0.08 * WIREMESH_FADE})`)
  verticalWash.addColorStop(1, `rgba(52, 211, 153, ${0.06 * WIREMESH_FADE})`)
  ctx.fillStyle = verticalWash
  ctx.fillRect(0, 0, width, height)

  const { points, edges, pixels } = WIREMESH_GEOMETRY

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const edge of edges) {
    const a = points[edge.a]
    const b = points[edge.b]
    const alpha = lineOpacity(edge.falloff, edge.midY) * 0.62
    if (alpha < 0.025) continue
    ctx.strokeStyle = `rgba(167, 243, 208, ${alpha})`
    ctx.lineWidth = Math.max(1.5, width * 0.003)
    ctx.beginPath()
    ctx.moveTo(a.x * width, a.y * height)
    ctx.lineTo(b.x * width, b.y * height)
    ctx.stroke()
  }

  for (const edge of edges) {
    const a = points[edge.a]
    const b = points[edge.b]
    const alpha = lineOpacity(edge.falloff, edge.midY)
    if (alpha < 0.035) continue
    ctx.strokeStyle = `rgba(52, 211, 153, ${alpha * 0.68})`
    ctx.lineWidth = Math.max(1, width * 0.00155)
    ctx.beginPath()
    ctx.moveTo(a.x * width, a.y * height)
    ctx.lineTo(b.x * width, b.y * height)
    ctx.stroke()
  }
  ctx.restore()

  for (const point of points) {
    const alpha = nodeOpacity(point.falloff, point.y)
    if (alpha < 0.04) continue
    const r = Math.max(1.1, width * 0.0022)
    ctx.fillStyle = `rgba(52, 211, 153, ${alpha})`
    ctx.beginPath()
    ctx.arc(point.x * width, point.y * height, r, 0, Math.PI * 2)
    ctx.fill()
  }

  for (const pixel of pixels) {
    const falloff = distFromFocus(pixel.x, pixel.y)
    const alpha = pixelOpacity(falloff, pixel.y)
    if (alpha < 0.06) continue
    const size = pixel.size * width
    const x = pixel.x * width - size / 2
    const y = pixel.y * height - size / 2
    ctx.fillStyle = pixel.soft
      ? `rgba(110, 231, 183, ${alpha * 0.72})`
      : `rgba(52, 211, 153, ${alpha * 0.95})`
    ctx.fillRect(x, y, size, size)
  }

  // 仅在最外圈压纸色，保留约 75% 网可见
  const edgeFade = ctx.createRadialGradient(
    width * WIREMESH_FOCUS_X,
    height * WIREMESH_FOCUS_Y,
    Math.min(width, height) * 0.38,
    width * WIREMESH_FOCUS_X,
    height * WIREMESH_FOCUS_Y,
    Math.max(width, height) * 0.78,
  )
  edgeFade.addColorStop(0, `rgba(${WIREMESH_CANVAS_RGB}, 0)`)
  edgeFade.addColorStop(0.55, `rgba(${WIREMESH_CANVAS_RGB}, 0.08)`)
  edgeFade.addColorStop(1, `rgba(${WIREMESH_CANVAS_RGB}, 0.62)`)
  ctx.fillStyle = edgeFade
  ctx.fillRect(0, 0, width, height)
}
