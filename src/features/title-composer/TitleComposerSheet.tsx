import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import {
  clampTitleSheetHeight,
  getTitleViewportHeight,
  readCachedTitleSheetHeight,
  writeCachedTitleSheetHeight,
} from './titleSheetHeight'

interface TitleComposerSheetProps {
  height: number
  onHeightChange: (height: number) => void
  children: ReactNode
}

function applyHeight(el: HTMLElement | null, height: number) {
  if (!el) return
  el.style.height = `${height}px`
  el.style.maxHeight = `${height}px`
}

/** 底部弹簧层：拖顶边改高度，上方预览区随之伸缩 */
export function TitleComposerSheet({
  height,
  onHeightChange,
  children,
}: TitleComposerSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const draggingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef(height)

  useEffect(() => {
    applyHeight(panelRef.current, height)
  }, [height])

  useEffect(() => {
    const sync = () => {
      if (draggingRef.current) return
      const next = clampTitleSheetHeight(height, getTitleViewportHeight())
      if (next !== height) onHeightChange(next)
    }
    window.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('resize', sync)
    }
  }, [height, onHeightChange])

  const moveRef = useRef<(event: PointerEvent) => void>(() => {})
  const endRef = useRef<() => void>(() => {})

  const schedule = (next: number) => {
    pendingRef.current = next
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      onHeightChange(pendingRef.current)
    })
  }

  const onMove = (event: PointerEvent) => moveRef.current(event)
  const onEnd = () => endRef.current()

  moveRef.current = (event: PointerEvent) => {
    if (!resizeRef.current) return
    const delta = resizeRef.current.startY - event.clientY
    const next = clampTitleSheetHeight(
      resizeRef.current.startHeight + delta,
      getTitleViewportHeight(),
    )
    applyHeight(panelRef.current, next)
    schedule(next)
  }

  endRef.current = () => {
    if (!resizeRef.current) return
    draggingRef.current = false
    resizeRef.current = null
    panelRef.current?.removeAttribute('data-dragging')
    document.body.classList.remove('is-dragging')
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onEnd)
    window.removeEventListener('pointercancel', onEnd)
    const finalHeight = pendingRef.current
    writeCachedTitleSheetHeight(finalHeight)
    onHeightChange(finalHeight)
  }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
      document.body.classList.remove('is-dragging')
    }
  }, [])

  const onResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    draggingRef.current = true
    panelRef.current?.setAttribute('data-dragging', 'true')
    document.body.classList.add('is-dragging')
    const current =
      height ||
      panelRef.current?.getBoundingClientRect().height ||
      readCachedTitleSheetHeight()
    pendingRef.current = current
    resizeRef.current = { startY: event.clientY, startHeight: current }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
  }

  return (
    <div
      ref={panelRef}
      className="title-composer__sheet"
      style={{ height, maxHeight: height }}
      data-open="true"
    >
      <div
        className="title-composer__sheet-handle"
        role="separator"
        aria-orientation="horizontal"
        aria-label="拖动调节配置面板高度"
        onPointerDown={onResizeStart}
      >
        <span className="title-composer__sheet-handle-bar" />
      </div>
      <div className="title-composer__sheet-body">{children}</div>
    </div>
  )
}
