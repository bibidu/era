import { useId } from 'react'
import {
  WIREMESH_CANVAS_COLOR,
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
        <radialGradient
          id={`${id}-mint-glow`}
          cx={`${WIREMESH_FOCUS_X * 100}%`}
          cy={`${WIREMESH_FOCUS_Y * 100}%`}
          r="62%"
        >
          <stop offset="0%" stopColor="rgba(167, 243, 208, 0.24)" />
          <stop offset="50%" stopColor="rgba(110, 231, 183, 0.09)" />
          <stop offset="100%" stopColor="rgba(238, 240, 242, 0)" />
        </radialGradient>
        <linearGradient id={`${id}-vertical-wash`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(167, 243, 208, 0.02)" />
          <stop offset="35%" stopColor="rgba(167, 243, 208, 0.04)" />
          <stop offset="70%" stopColor="rgba(110, 231, 183, 0.08)" />
          <stop offset="100%" stopColor="rgba(52, 211, 153, 0.06)" />
        </linearGradient>
        <radialGradient
          id={`${id}-edge-fade`}
          cx={`${WIREMESH_FOCUS_X * 100}%`}
          cy={`${WIREMESH_FOCUS_Y * 100}%`}
          r="78%"
        >
          <stop offset="0%" stopColor="rgba(238, 240, 242, 0)" />
          <stop offset="55%" stopColor="rgba(238, 240, 242, 0.08)" />
          <stop offset="100%" stopColor="rgba(238, 240, 242, 0.62)" />
        </radialGradient>
        <pattern
          id={`${id}-paper`}
          width="0.03"
          height="0.03"
          patternUnits="objectBoundingBox"
        >
          <path
            d="M0 0.015 H0.03"
            stroke="rgba(148,163,184,0.07)"
            strokeWidth="0.001"
          />
          <path
            d="M0 0 L0.03 0.03"
            stroke="rgba(148,163,184,0.04)"
            strokeWidth="0.001"
          />
        </pattern>
      </defs>

      {!stacked && <rect width="1" height="1" fill={WIREMESH_CANVAS_COLOR} />}
      {!stacked && <rect width="1" height="1" fill={`url(#${id}-paper)`} />}
      <rect width="1" height="1" fill={`url(#${id}-mint-glow)`} />
      <rect width="1" height="1" fill={`url(#${id}-vertical-wash)`} />

      {edges.map((edge, index) => {
        const a = points[edge.a]
        const b = points[edge.b]
        const alpha = lineOpacity(edge.falloff, edge.midY)
        if (alpha < 0.03) return null
        return (
          <g key={`e-${index}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={`rgba(167, 243, 208, ${alpha * 0.62})`}
              strokeWidth={0.0038}
              strokeLinecap="round"
            />
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={`rgba(52, 211, 153, ${alpha * 0.68})`}
              strokeWidth={0.0017}
              strokeLinecap="round"
            />
          </g>
        )
      })}

      {points.map((point, index) => {
        const alpha = nodeOpacity(point.falloff, point.y)
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
        const alpha = pixelOpacity(falloff, pixel.y)
        if (alpha < 0.06) return null
        return (
          <rect
            key={`p-${index}`}
            x={pixel.x - pixel.size / 2}
            y={pixel.y - pixel.size / 2}
            width={pixel.size}
            height={pixel.size}
            fill={
              pixel.soft
                ? `rgba(110, 231, 183, ${alpha * 0.72})`
                : `rgba(52, 211, 153, ${alpha * 0.95})`
            }
          />
        )
      })}

      <rect width="1" height="1" fill={`url(#${id}-edge-fade)`} />
    </svg>
  )
}
