import { type ReactNode, useId } from 'react'
import {
  HAND_DRAWN_UNDERLINE_PATH,
  HAND_DRAWN_UNDERLINE_STROKE_WIDTH,
  HAND_DRAWN_UNDERLINE_TILE_WIDTH,
  HAND_DRAWN_UNDERLINE_VIEWBOX,
  HAND_DRAWN_UNDERLINE_VIEWBOX_HEIGHT,
} from './handDrawnUnderline'

interface HandDrawnUnderlineProps {
  color: string
  children: ReactNode
  className?: string
}

export function HandDrawnUnderline({ color, children, className = '' }: HandDrawnUnderlineProps) {
  const patternId = useId()

  return (
    <span className={`graphic-hand-underline ${className}`.trim()}>
      <span className="graphic-hand-underline-text">{children}</span>
      <svg
        className="graphic-hand-underline-svg"
        viewBox={`0 0 ${HAND_DRAWN_UNDERLINE_TILE_WIDTH} ${HAND_DRAWN_UNDERLINE_VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <pattern
            id={patternId}
            width={HAND_DRAWN_UNDERLINE_TILE_WIDTH}
            height={HAND_DRAWN_UNDERLINE_VIEWBOX_HEIGHT}
            patternUnits="userSpaceOnUse"
            viewBox={HAND_DRAWN_UNDERLINE_VIEWBOX}
            preserveAspectRatio="none"
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
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </span>
  )
}
