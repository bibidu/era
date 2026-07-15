import { PAPER_PREVIEW_DASHES, PAPER_NOISE_OPACITY, paperDashDashArray, paperDashPath, paperDashStroke } from './pagePaperOverlay'

export function PaperPreviewArt() {
  return (
    <svg className="size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
      <defs>
        <filter id="paper-preview-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" seed="8" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.28 0"
          />
        </filter>
      </defs>
      <rect width="1" height="1" fill="#f7f2e8" />
      <rect
        width="1"
        height="1"
        filter="url(#paper-preview-grain)"
        opacity={PAPER_NOISE_OPACITY + 0.08}
        style={{ mixBlendMode: 'multiply' }}
      />
      {PAPER_PREVIEW_DASHES.map((segment, index) => (
        <path
          key={index}
          d={paperDashPath(segment)}
          fill="none"
          stroke={paperDashStroke(segment)}
          strokeWidth={segment.width * 0.0022}
          strokeDasharray={paperDashDashArray(segment)}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}
