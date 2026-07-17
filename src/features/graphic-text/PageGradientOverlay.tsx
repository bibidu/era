import {
  gradientVariantToCss,
  resolveGradientVariant,
  type GradientOverlayVariant,
} from './pageGradientOverlay'

export function PageGradientOverlay({
  variant,
}: {
  variant?: GradientOverlayVariant | null
}) {
  const css = gradientVariantToCss(resolveGradientVariant(variant))
  return (
    <div
      className="graphic-page-overlay pointer-events-none absolute inset-0 z-0"
      style={{ background: css }}
      aria-hidden
    />
  )
}
