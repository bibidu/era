import { GRADIENT_OVERLAY_CSS } from './pageGradientOverlay'

export function PageGradientOverlay() {
  return (
    <div
      className="graphic-page-overlay pointer-events-none absolute inset-0 z-0"
      style={{ background: GRADIENT_OVERLAY_CSS }}
      aria-hidden
    />
  )
}
