export interface GradientOverlayStop {
  offset: number
  color: string
}

export interface GradientOverlayVariant {
  angle: number
  stops: GradientOverlayStop[]
}

/** 薄荷绿 → 淡紫，保持当前渐变模板的大体气质 */
const GRADIENT_COLOR_SETS: string[][] = [
  ['#E0F5F0', '#F0F7F5', '#F8F6FF', '#F0E8FF'],
  ['#D8F3EC', '#EEF6F3', '#F6F3FF', '#EDE4FF'],
  ['#E8F7F2', '#F3F8F6', '#FAF8FF', '#F3EBFF'],
  ['#F0E8FF', '#F8F6FF', '#F0F7F5', '#E0F5F0'],
]

const GRADIENT_ANGLE_CHOICES = [48, 72, 108, 128, 135, 148, 162, 198, 225, 248]

export const DEFAULT_GRADIENT_VARIANT: GradientOverlayVariant = {
  angle: 135,
  stops: [
    { offset: 0, color: '#E0F5F0' },
    { offset: 0.4, color: '#F0F7F5' },
    { offset: 0.7, color: '#F8F6FF' },
    { offset: 1, color: '#F0E8FF' },
  ],
}

export const GRADIENT_OVERLAY_FALLBACK = '#E0F5F0'
export const GRADIENT_OVERLAY_STOPS = DEFAULT_GRADIENT_VARIANT.stops

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0]
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function resolveGradientVariant(
  variant: GradientOverlayVariant | null | undefined,
): GradientOverlayVariant {
  if (!variant || !variant.stops?.length) return DEFAULT_GRADIENT_VARIANT
  return variant
}

export function gradientVariantToCss(variant: GradientOverlayVariant): string {
  const stops = variant.stops
    .map((stop) => `${stop.color} ${(stop.offset * 100).toFixed(1)}%`)
    .join(', ')
  return `linear-gradient(${variant.angle}deg, ${stops})`
}

export const GRADIENT_OVERLAY_CSS = gradientVariantToCss(DEFAULT_GRADIENT_VARIANT)

/** 每次选择渐变模板时生成新变体：角度、色停位置略有变化，气质相近 */
export function createRandomGradientVariant(): GradientOverlayVariant {
  const colors = pickRandom(GRADIENT_COLOR_SETS)
  const angle = pickRandom(GRADIENT_ANGLE_CHOICES) + (Math.random() * 10 - 5)
  const midA = clamp01(0.22 + Math.random() * 0.22)
  const midB = clamp01(Math.max(midA + 0.12, 0.52 + Math.random() * 0.22))

  return {
    angle: Math.round(angle * 10) / 10,
    stops: [
      { offset: 0, color: colors[0] },
      { offset: midA, color: colors[1] },
      { offset: midB, color: colors[2] },
      { offset: 1, color: colors[3] },
    ],
  }
}

export function drawPageGradientBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  variant: GradientOverlayVariant | null | undefined = DEFAULT_GRADIENT_VARIANT,
) {
  const resolved = resolveGradientVariant(variant)
  const radians = (resolved.angle * Math.PI) / 180
  const diagonal = Math.sqrt(width * width + height * height)
  const centerX = width / 2
  const centerY = height / 2
  const gradient = ctx.createLinearGradient(
    centerX - Math.cos(radians) * diagonal * 0.5,
    centerY - Math.sin(radians) * diagonal * 0.5,
    centerX + Math.cos(radians) * diagonal * 0.5,
    centerY + Math.sin(radians) * diagonal * 0.5,
  )

  for (const stop of resolved.stops) {
    gradient.addColorStop(clamp01(stop.offset), stop.color)
  }

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}
