import {
  PIXEL_DASHED_DIVISIONS,
  PIXEL_DASHED_LINE_COLOR,
  PIXEL_HEADER_LINE_COLOR,
  PIXEL_HEADER_LINE_Y,
  PIXEL_OVERLAY_RECTS,
} from './pagePixelOverlay'

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(59, 130, 246, ${alpha})`
  const r = Number.parseInt(normalized.slice(1, 3), 16)
  const g = Number.parseInt(normalized.slice(3, 5), 16)
  const b = Number.parseInt(normalized.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function PagePixelOverlay() {
  const dashedLines: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let index = 1; index < PIXEL_DASHED_DIVISIONS; index += 1) {
    const ratio = index / PIXEL_DASHED_DIVISIONS
    dashedLines.push({ x1: ratio, y1: 0, x2: ratio, y2: 1 })
    dashedLines.push({ x1: 0, y1: ratio, x2: 1, y2: ratio })
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1] size-full"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden
    >
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
      {PIXEL_HEADER_LINE_Y.map((y, index) => (
        <line
          key={`header-${index}`}
          x1={0}
          y1={y}
          x2={1}
          y2={y}
          stroke={PIXEL_HEADER_LINE_COLOR}
          strokeWidth={0.0015}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {dashedLines.map((line, index) => (
        <line
          key={`dash-${index}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={PIXEL_DASHED_LINE_COLOR}
          strokeWidth={0.0015}
          strokeDasharray="0.012 0.012"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
