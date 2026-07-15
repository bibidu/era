import { useId } from 'react'
import { PAPER_SCRATCHES, PAPER_SPECKLES, PAPER_WARM_IVORY } from './pagePaperOverlay'

export function PagePaperOverlay() {
  const id = useId().replace(/:/g, '')

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1] size-full"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-wash`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#fff8ec" stopOpacity="0" />
          <stop offset="72%" stopColor="#e8d6bc" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#c6b08e" stopOpacity="0.1" />
        </linearGradient>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.95"
            numOctaves="4"
            seed="8"
            result="noise"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.97  0 0 0 0 0.94  0 0 0 0 0.88  0 0 0 0.2 0"
            in="noise"
          />
        </filter>
        <filter id={`${id}-fiber`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02 0.88"
            numOctaves="2"
            seed="3"
            result="fiber"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.95  0 0 0 0 0.9  0 0 0 0 0.82  0 0 0 0.08 0"
            in="fiber"
          />
        </filter>
      </defs>

      <rect width="1" height="1" fill={PAPER_WARM_IVORY} opacity="0.08" />
      <rect width="1" height="1" fill={`url(#${id}-wash)`} />
      <rect width="1" height="1" filter={`url(#${id}-grain)`} opacity="0.42" style={{ mixBlendMode: 'multiply' }} />
      <rect width="1" height="1" filter={`url(#${id}-fiber)`} opacity="0.55" style={{ mixBlendMode: 'soft-light' }} />

      {PAPER_SPECKLES.map((speckle, index) => (
        <circle
          key={`speckle-${index}`}
          cx={speckle.x}
          cy={speckle.y}
          r={speckle.radius}
          fill={`rgba(118, 98, 72, ${speckle.alpha})`}
        />
      ))}

      {PAPER_SCRATCHES.map((scratch, index) => (
        <line
          key={`scratch-${index}`}
          x1={scratch.x1}
          y1={scratch.y1}
          x2={scratch.x2}
          y2={scratch.y2}
          stroke={`rgba(142, 124, 98, ${scratch.alpha})`}
          strokeWidth={scratch.width * 0.0015}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}
