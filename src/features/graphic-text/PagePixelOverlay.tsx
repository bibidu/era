import { useId } from 'react'
import {
  PIXEL_CANVAS_COLOR,
  PIXEL_GLASS_SHAPES,
  PIXEL_GRID_DIVISIONS,
  PIXEL_GRID_ACCENT_COLOR,
  PIXEL_GRID_LINE_COLOR,
  PIXEL_HEADER_LINE_COLOR,
  PIXEL_HEADER_LINE_Y,
} from './pagePixelOverlay'

export function PagePixelOverlay() {
  const id = useId().replace(/:/g, '')
  const gridLines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = []

  for (let index = 1; index < PIXEL_GRID_DIVISIONS; index += 1) {
    const ratio = index / PIXEL_GRID_DIVISIONS
    const major = index % 4 === 0
    gridLines.push({ x1: ratio, y1: 0, x2: ratio, y2: 1, major })
    gridLines.push({ x1: 0, y1: ratio, x2: 1, y2: ratio, major })
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1] size-full"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}-blue-glow`} cx="82%" cy="14%" r="55%">
          <stop offset="0%" stopColor="rgba(59, 130, 246, 0.16)" />
          <stop offset="45%" stopColor="rgba(34, 211, 238, 0.07)" />
          <stop offset="100%" stopColor="rgba(250, 251, 252, 0)" />
        </radialGradient>
        <radialGradient id={`${id}-violet-glow`} cx="12%" cy="88%" r="38%">
          <stop offset="0%" stopColor="rgba(167, 139, 250, 0.12)" />
          <stop offset="100%" stopColor="rgba(250, 251, 252, 0)" />
        </radialGradient>
      </defs>

      <rect width="1" height="1" fill={PIXEL_CANVAS_COLOR} />
      <rect width="1" height="1" fill={`url(#${id}-blue-glow)`} />
      <rect width="1" height="1" fill={`url(#${id}-violet-glow)`} />

      {gridLines.map((line, index) => (
        <line
          key={`grid-${index}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.major ? PIXEL_GRID_ACCENT_COLOR : PIXEL_GRID_LINE_COLOR}
          strokeWidth={0.0012}
          vectorEffect="non-scaling-stroke"
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
          strokeWidth={0.0012}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {PIXEL_GLASS_SHAPES.map((shape, index) => (
        <rect
          key={`glass-${index}`}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.radius}
          ry={shape.radius}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={0.0014}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
