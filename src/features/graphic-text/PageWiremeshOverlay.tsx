import { useId } from 'react'
import {
  WIREMESH_CANVAS_COLOR,
  WIREMESH_FOCUS_X,
  WIREMESH_FOCUS_Y,
  WIREMESH_GEOMETRY,
} from './pageWiremeshTokens'

interface PageWiremeshOverlayProps {
  stacked?: boolean
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function lineOpacity(falloff: number) {
  return clamp01(1 - falloff * 0.92) * 0.9
}

function nodeOpacity(falloff: number) {
  return clamp01(1 - falloff * 1.05)
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
          r="52%"
        >
          <stop offset="0%" stopColor="rgba(167, 243, 208, 0.28)" />
          <stop offset="45%" stopColor="rgba(110, 231, 183, 0.1)" />
          <stop offset="100%" stopColor="rgba(238, 240, 242, 0)" />
        </radialGradient>
        <radialGradient
          id={`${id}-edge-fade`}
          cx={`${WIREMESH_FOCUS_X * 100}%`}
          cy={`${WIREMESH_FOCUS_Y * 100}%`}
          r="68%"
        >
          <stop offset="0%" stopColor="rgba(238, 240, 242, 0)" />
          <stop offset="65%" stopColor="rgba(238, 240, 242, 0.16)" />
          <stop offset="100%" stopColor="rgba(238, 240, 242, 0.78)" />
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

      {edges.map((edge, index) => {
        const a = points[edge.a]
        const b = points[edge.b]
        const alpha = lineOpacity(edge.falloff)
        if (alpha < 0.03) return null
        return (
          <g key={`e-${index}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={`rgba(167, 243, 208, ${alpha * 0.55})`}
              strokeWidth={0.004}
              strokeLinecap="round"
            />
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={`rgba(52, 211, 153, ${alpha * 0.55})`}
              strokeWidth={0.0018}
              strokeLinecap="round"
            />
          </g>
        )
      })}

      {points.map((point, index) => {
        const alpha = nodeOpacity(point.falloff) * 0.55
        if (alpha < 0.05) return null
        return (
          <circle
            key={`n-${index}`}
            cx={point.x}
            cy={point.y}
            r={0.0032}
            fill={`rgba(52, 211, 153, ${alpha})`}
          />
        )
      })}

      {pixels.map((pixel, index) => {
        const falloff = Math.sqrt(
          ((pixel.x - WIREMESH_FOCUS_X) / 0.48) ** 2 +
            ((pixel.y - WIREMESH_FOCUS_Y) / 0.42) ** 2,
        )
        const alpha = clamp01(1 - falloff * 1.1)
        if (alpha < 0.08) return null
        return (
          <rect
            key={`p-${index}`}
            x={pixel.x - pixel.size / 2}
            y={pixel.y - pixel.size / 2}
            width={pixel.size}
            height={pixel.size}
            fill={
              pixel.soft
                ? `rgba(110, 231, 183, ${alpha * 0.7})`
                : `rgba(52, 211, 153, ${alpha * 0.92})`
            }
          />
        )
      })}

      <rect width="1" height="1" fill={`url(#${id}-edge-fade)`} />
    </svg>
  )
}
