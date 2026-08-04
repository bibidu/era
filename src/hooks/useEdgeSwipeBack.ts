import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

export type UseEdgeSwipeBackOptions = {
  /** 为 false 时禁用手势（如弹层打开时） */
  enabled?: boolean
  /** 左侧边缘触发宽度（px） */
  edgeWidth?: number
  /** 触发返回的位移阈值（px） */
  threshold?: number
}

export type EdgeSwipeBackBind = {
  ref: RefObject<HTMLDivElement | null>
  style: CSSProperties
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void
}

/**
 * 二级页左缘右滑返回（iOS 侧滑风格）。
 * 手指从左缘滑入并向右拖，超过阈值松手后调用 onBack。
 */
export function useEdgeSwipeBack(
  onBack: () => void,
  options: UseEdgeSwipeBackOptions = {},
): EdgeSwipeBackBind {
  const { enabled = true, edgeWidth = 28, threshold = 72 } = options
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const trackingRef = useRef(false)
  const axisLockedRef = useRef<'x' | 'y' | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  const reset = useCallback(() => {
    trackingRef.current = false
    axisLockedRef.current = null
    pointerIdRef.current = null
    setDragging(false)
    setOffset(0)
  }, [])

  useEffect(() => {
    if (!enabled) reset()
  }, [enabled, reset])

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!enabled) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const target = event.target
    if (
      target instanceof Element &&
      target.closest('[role="dialog"], [aria-modal="true"], input, textarea, select')
    ) {
      return
    }
    const localX = event.clientX - event.currentTarget.getBoundingClientRect().left
    if (localX > edgeWidth) return
    pointerIdRef.current = event.pointerId
    startXRef.current = event.clientX
    startYRef.current = event.clientY
    trackingRef.current = true
    axisLockedRef.current = null
    setDragging(true)
    setOffset(0)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!trackingRef.current || pointerIdRef.current !== event.pointerId) return
    const dx = event.clientX - startXRef.current
    const dy = event.clientY - startYRef.current
    if (axisLockedRef.current == null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      axisLockedRef.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
      if (axisLockedRef.current === 'y') {
        reset()
        return
      }
    }
    if (axisLockedRef.current !== 'x') return
    setOffset(Math.max(0, dx))
  }

  function finish(dx: number) {
    const shouldBack = dx >= threshold
    reset()
    if (shouldBack) onBackRef.current()
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!trackingRef.current) return
    finish(event.clientX - startXRef.current)
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return
    reset()
  }

  return {
    ref,
    style: {
      transform: offset > 0 ? `translate3d(${offset}px, 0, 0)` : undefined,
      transition: dragging ? 'none' : 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
      touchAction: 'pan-y',
      willChange: dragging ? 'transform' : undefined,
    },
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  }
}
