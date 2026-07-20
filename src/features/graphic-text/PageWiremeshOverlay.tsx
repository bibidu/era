import { useId } from 'react'
import {
  WIREMESH_CANVAS_COLOR,
  WIREMESH_CANVAS_RGB,
  WIREMESH_FADE,
  WIREMESH_FOCUS_X,
  WIREMESH_FOCUS_Y,
  WIREMESH_GEOMETRY,
  lineOpacity,
  nodeOpacity,
  pixelOpacity,
} from './pageWiremeshTokens'

interface PageWiremeshOverlayProps {
  stacked?: boolean
}

export function PageWiremeshOverlay({ stacked = false }: PageWiremeshOverlayProps) {
  const id = useId().replace(/:/g, '')
  const { points, edges, pixels } = WIREMESH_GEOMETRY

  return (
    <svg
      className="graphic-page-overlay pointer-events-none absolute inset-0 z-0 size-full"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}-glow-tl`} cx="18%" cy="16%" r="42%">
          <stop offset="0%" stopColor={`rgba(167, 243, 208, ${0.14 * WIREMESH_FADE})`} />
          <stop offset="55%" stopColor={`rgba(110, 231, 183, ${0.05 * WIREMESH_FADE})`} />
          <stop offset="100%" stopColor={`rgba(${WIREMESH_CANVAS_RGB}, 0)`} />
        </radialGradient>
        <radialGradient id={`${id}-glow-br`} cx="82%" cy="84%" r="42%">
          <stop offset="0%" stopColor={`rgba(167, 243, 208, ${0.14 * WIREMESH_FADE})`} />
          <stop offset="55%" stopColor={`rgba(110, 231, 183, ${0.05 * WIREMESH_FADE})`} />
          <stop offset="100%" stopColor={`rgba(${WIREMESH_CANVAS_RGB}, 0)`} />
        </radialGradient>
        <radialGradient
          id={`${id}-edge-fade`}
          cx={`${WIREMESH_FOCUS_X * 100}%`}
          cy={`${WIREMESH_FOCUS_Y * 100}%`}
          r="78%"
        >
          <stop offset="0%" stopColor={`rgba(${WIREMESH_CANVAS_RGB}, 0)`} />
          <stop offset="55%" stopColor={`rgba(${WIREMESH_CANVAS_RGB}, 0.08)`} />
          <stop offset="100%" stopColor={`rgba(${WIREMESH_CANVAS_RGB}, 0.62)`} />
        </radialGradient>
        <pattern
          id={`${id}-paper`}
          width="0.03"
          height="0.03"
          patternUnits="objectBoundingBox"
        >
          <path
            d="M0 0.015 H0.03"
            stroke={`rgba(148,163,184,${0.07 * WIREMESH_FADE})`}
            strokeWidth="0.001"
          />
          <path
            d="M0 0 L0.03 0.03"
            stroke={`rgba(148,163,184,${0.04 * WIREMESH_FADE})`}
            strokeWidth="0.001"
          />
        </pattern>
      </defs>

      {!stacked && <rect width="1" height="1" fill={WIREMESH_CANVAS_COLOR} />}
      {!stacked && <rect width="1" height="1" fill={`url(#${id}-paper)`} />}
      <rect width="1" height="1" fill={`url(#${id}-glow-tl)`} />
      <rect width="1" height="1" fill={`url(#${id}-glow-br)`} />

      {edges.map((edge, index) => {
        const a = points[edge.a]
        const b = points[edge.b]
        const alpha = lineOpacity(edge.falloff, edge.midX, edge.midY)
        if (alpha < 0.04) return null
        return (
          <g key={`e-${index}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={`rgba(167, 243, 208, ${alpha * 0.55})`}
              strokeWidth={0.0038}
              strokeLinecap="round"
            />
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={`rgba(52, 211, 153, ${alpha})`}
              strokeWidth={0.0017}
              strokeLinecap="round"
            />
          </g>
        )
      })}

      {points.map((point, index) => {
        const alpha = nodeOpacity(point.falloff, point.x, point.y)
        if (alpha < 0.04) return null
        return (
          <circle
            key={`n-${index}`}
            cx={point.x}
            cy={point.y}
            r={0.003}
            fill={`rgba(52, 211, 153, ${alpha})`}
          />
        )
      })}

      {pixels.map((pixel, index) => {
        const falloff = Math.sqrt(
          ((pixel.x - WIREMESH_FOCUS_X) / 0.62) ** 2 +
            ((pixel.y - WIREMESH_FOCUS_Y) / 0.68) ** 2,
        )
        const alpha = pixelOpacity(falloff, pixel.x, pixel.y)
        if (alpha < 0.05) return null
        return (
          <rect
            key={`p-${index}`}
            x={pixel.x - pixel.size / 2}
            y={pixel.y - pixel.size / 2}
            width={pixel.size}
            height={pixel.size}
            fill={
              pixel.soft
                ? `rgba(110, 231, 183, ${alpha * 0.85})`
                : `rgba(52, 211, 153, ${alpha})`
            }
          />
        )
      })}

      <rect width="1" height="1" fill={`url(#${id}-edge-fade)`} />
    </svg>
  )
}
