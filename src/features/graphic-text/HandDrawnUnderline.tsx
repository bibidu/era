import type { ReactNode } from 'react'
import {
  HAND_DRAWN_UNDERLINE_PATH,
  HAND_DRAWN_UNDERLINE_STROKE_WIDTH,
  HAND_DRAWN_UNDERLINE_VIEWBOX,
} from './handDrawnUnderline'

interface HandDrawnUnderlineProps {
  color: string
  children: ReactNode
  className?: string
}

export function HandDrawnUnderline({ color, children, className = '' }: HandDrawnUnderlineProps) {
  return (
    <span className={`graphic-hand-underline ${className}`.trim()}>
      <span className="graphic-hand-underline-text">{children}</span>
      <svg
        className="graphic-hand-underline-svg"
        viewBox={HAND_DRAWN_UNDERLINE_VIEWBOX}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={HAND_DRAWN_UNDERLINE_PATH}
          fill="none"
          stroke={color}
          strokeWidth={HAND_DRAWN_UNDERLINE_STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
