import { PIXEL_CANVAS_COLOR, PIXEL_GLASS_SHAPES, PIXEL_GRID_DIVISIONS } from './pagePixelOverlay'

export function PixelPreviewArt() {
  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let index = 1; index < PIXEL_GRID_DIVISIONS; index += 1) {
    const ratio = index / PIXEL_GRID_DIVISIONS
    gridLines.push({ x1: ratio, y1: 0, x2: ratio, y2: 1 })
    gridLines.push({ x1: 0, y1: ratio, x2: 1, y2: ratio })
  }

  return (
    <svg className="size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
      <defs>
        <radialGradient id="pixel-preview-glow" cx="78%" cy="18%" r="60%">
          <stop offset="0%" stopColor="rgba(59, 130, 246, 0.22)" />
          <stop offset="100%" stopColor="rgba(250, 251, 252, 0)" />
        </radialGradient>
      </defs>
      <rect width="1" height="1" fill={PIXEL_CANVAS_COLOR} />
      <rect width="1" height="1" fill="url(#pixel-preview-glow)" />
      {gridLines.map((line, index) => (
        <line
          key={index}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(203, 213, 225, 0.55)"
          strokeWidth={0.0025}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {PIXEL_GLASS_SHAPES.slice(0, 4).map((shape, index) => (
        <rect
          key={index}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.radius}
          ry={shape.radius}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={0.003}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
