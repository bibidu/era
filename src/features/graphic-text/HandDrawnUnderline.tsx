import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  buildContinuousHandUnderlinePath,
  HAND_DRAWN_UNDERLINE_STROKE_WIDTH,
  HAND_DRAWN_UNDERLINE_TILE_WIDTH,
  HAND_DRAWN_UNDERLINE_VIEWBOX_HEIGHT,
} from './handDrawnUnderline'

interface HandDrawnUnderlineProps {
  color: string
  children: ReactNode
  className?: string
}

/**
 * 按连续选区整体测量宽度后绘制一条连续手绘线（36px 周期平滑铺开）。
 * 选区变化 → 宽度变化 → 路径整体重算，避免逐字断开。
 */
export function HandDrawnUnderline({ color, children, className = '' }: HandDrawnUnderlineProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return

    const update = () => {
      const next = el.getBoundingClientRect().width
      setWidth((current) => (Math.abs(current - next) < 0.5 ? current : next))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [children])

  const path = useMemo(
    () => buildContinuousHandUnderlinePath(width, HAND_DRAWN_UNDERLINE_TILE_WIDTH),
    [width],
  )

  return (
    <span ref={rootRef} className={`graphic-hand-underline ${className}`.trim()}>
      <span className="graphic-hand-underline-text">{children}</span>
      {width > 0 && path ? (
        <svg
          className="graphic-hand-underline-svg"
          width={width}
          height={HAND_DRAWN_UNDERLINE_VIEWBOX_HEIGHT}
          viewBox={`0 0 ${width} ${HAND_DRAWN_UNDERLINE_VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={HAND_DRAWN_UNDERLINE_STROKE_WIDTH}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  )
}
