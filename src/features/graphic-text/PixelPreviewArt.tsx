import { PIXEL_OVERLAY_RECTS } from './pagePixelOverlay'

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(59, 130, 246, ${alpha})`
  const r = Number.parseInt(normalized.slice(1, 3), 16)
  const g = Number.parseInt(normalized.slice(3, 5), 16)
  const b = Number.parseInt(normalized.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function PixelPreviewArt() {
  return (
    <svg className="size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
      <rect width="1" height="1" fill="#f5f8fc" />
      {PIXEL_OVERLAY_RECTS.map((rect, index) => (
        <rect
          key={index}
          x={rect.x}
          y={rect.y}
          width={rect.size}
          height={rect.size}
          fill={hexToRgba(rect.color, rect.alpha)}
        />
      ))}
    </svg>
  )
}
