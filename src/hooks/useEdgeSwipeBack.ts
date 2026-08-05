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
 * 确认返回时保持当前位移并立刻 onBack，不做回弹/滑出动画，避免与叠层卸载抢帧抖动。
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
  const committingRef = useRef(false)
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  const reset = useCallback(() => {
    trackingRef.current = false
    axisLockedRef.current = null
    pointerIdRef.current = null
    committingRef.current = false
    setDragging(false)
    setOffset(0)
  }, [])

  useEffect(() => {
    if (!enabled) reset()
  }, [enabled, reset])

  // 阻止 iOS Safari 原生边缘返回与自定义手势叠在一起抖
  useEffect(() => {
    const node = ref.current
    if (!node || !enabled) return

    const onTouchStart = (event: TouchEvent) => {
      if (committingRef.current) return
      const touch = event.touches[0]
      if (!touch) return
      const localX = touch.clientX - node.getBoundingClientRect().left
      if (localX <= edgeWidth) {
        event.preventDefault()
      }
    }

    node.addEventListener('touchstart', onTouchStart, { passive: false })
    return () => node.removeEventListener('touchstart', onTouchStart)
  }, [enabled, edgeWidth])

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!enabled || committingRef.current) return
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
    if (!trackingRef.current) return
    trackingRef.current = false
    axisLockedRef.current = null
    pointerIdRef.current = null

    if (dx >= threshold) {
      // 保持 dragging=true → transition:none，停在当前位移直接返回，避免弹回/滑出动画
      committingRef.current = true
      onBackRef.current()
      return
    }

    setDragging(false)
    setOffset(0)
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
    if (committingRef.current) return
    reset()
  }

  return {
    ref,
    style: {
      transform: offset > 0 ? `translate3d(${offset}px, 0, 0)` : undefined,
      transition: dragging || committingRef.current
        ? 'none'
        : 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
      touchAction: dragging ? 'none' : 'pan-y',
      willChange: dragging || offset > 0 ? 'transform' : undefined,
      overscrollBehaviorX: 'none',
    },
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  }
}
