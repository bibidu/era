import { GRADIENT_OVERLAY_CSS } from './pageGradientOverlay'

export function GradientPreviewArt() {
  return (
    <div
      className="size-full"
      style={{ background: GRADIENT_OVERLAY_CSS }}
      aria-hidden
    />
  )
}
