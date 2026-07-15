import { useId } from 'react'
import {
  PAPER_DASH_SEGMENTS,
  PAPER_NOISE_OPACITY,
  paperDashDashArray,
  paperDashPath,
  paperDashStroke,
} from './pagePaperOverlay'

export function PagePaperOverlay() {
  const id = useId().replace(/:/g, '')

  return (
    <svg
      className="graphic-page-overlay pointer-events-none absolute inset-0 z-0 size-full"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="4" seed="8" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.22 0"
          />
        </filter>
      </defs>
      <rect
        width="1"
        height="1"
        filter={`url(#${id}-grain)`}
        opacity={PAPER_NOISE_OPACITY}
        style={{ mixBlendMode: 'multiply' }}
      />
      {PAPER_DASH_SEGMENTS.map((segment, index) => (
        <path
          key={`dash-${index}`}
          d={paperDashPath(segment)}
          fill="none"
          stroke={paperDashStroke(segment)}
          strokeWidth={segment.width * 0.0014}
          strokeDasharray={paperDashDashArray(segment)}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
