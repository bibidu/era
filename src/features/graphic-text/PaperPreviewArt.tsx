import { PAPER_FIBER_LINES, PAPER_SCRATCHES, PAPER_SPECKLES, PAPER_WARM_IVORY, paperFiberPath, paperFiberStroke } from './pagePaperOverlay'

export function PaperPreviewArt() {
  return (
    <svg className="size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="paper-preview-wash" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#fff8ec" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#d8c4a8" stopOpacity="0.22" />
        </linearGradient>
        <filter id="paper-preview-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" seed="8" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.97  0 0 0 0 0.94  0 0 0 0 0.88  0 0 0 0.24 0"
          />
        </filter>
      </defs>
      <rect width="1" height="1" fill={PAPER_WARM_IVORY} />
      <rect width="1" height="1" fill="url(#paper-preview-wash)" opacity="0.9" />
      <rect width="1" height="1" filter="url(#paper-preview-grain)" opacity="0.5" style={{ mixBlendMode: 'multiply' }} />
      {PAPER_FIBER_LINES.slice(0, 12).map((line, index) => (
        <path
          key={`fiber-${index}`}
          d={paperFiberPath(line)}
          fill="none"
          stroke={paperFiberStroke(line)}
          strokeWidth={line.width * 0.0022}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      ))}
      {PAPER_SPECKLES.slice(0, 12).map((speckle, index) => (
        <circle
          key={index}
          cx={speckle.x}
          cy={speckle.y}
          r={speckle.radius * 1.6}
          fill={`rgba(118, 98, 72, ${speckle.alpha + 0.04})`}
        />
      ))}
      {PAPER_SCRATCHES.slice(0, 5).map((scratch, index) => (
        <line
          key={index}
          x1={scratch.x1}
          y1={scratch.y1}
          x2={scratch.x2}
          y2={scratch.y2}
          stroke={`rgba(132, 126, 116, ${scratch.alpha + 0.03})`}
          strokeWidth={0.002}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}
