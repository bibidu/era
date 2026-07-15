import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { GraphicHighlightEditor } from './GraphicHighlightEditor'
import { type GraphicConfigPanel } from './graphicConfigPanels'
import {
  clampSheetHeight,
  getViewportHeight,
  readCachedSheetHeight,
  writeCachedSheetHeight,
} from './topBar'
import type { GraphicTextConfig } from './types'

interface GraphicTextConfigSheetProps {
  isOpen: boolean
  panel: GraphicConfigPanel
  config: GraphicTextConfig
  markdown: string
  onOpenChange: (open: boolean) => void
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
}

function applySheetHeight(panelEl: HTMLElement | null, sheetHeight: number) {
  if (!panelEl) return
  panelEl.style.height = `${sheetHeight}px`
  panelEl.style.maxHeight = `${sheetHeight}px`
}

export function GraphicTextConfigSheet({
  isOpen,
  panel,
  config,
  markdown,
  onOpenChange,
  onUpdate,
}: GraphicTextConfigSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const isDraggingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const pendingHeightRef = useRef(0)
  const [sheetHeight, setSheetHeight] = useState(0)
  const [highlightDraft, setHighlightDraft] = useState({
    underline: config.underlineHighlightColors,
    quote: config.quoteHighlightColors,
    circle: config.circleHighlightColors,
    pickerColor: config.highlightPickerColor,
  })

  useEffect(() => {
    if (!isOpen) {
      setSheetHeight(0)
      return
    }

    const syncViewport = () => {
      if (!isDraggingRef.current) {
        setSheetHeight((current) =>
          current > 0 ? clampSheetHeight(current, getViewportHeight()) : current,
        )
      }
    }

    const initialHeight = readCachedSheetHeight(getViewportHeight())
    pendingHeightRef.current = initialHeight
    setSheetHeight(initialHeight)
    applySheetHeight(panelRef.current, initialHeight)

    window.addEventListener('resize', syncViewport)
    window.visualViewport?.addEventListener('resize', syncViewport)

    return () => {
      window.removeEventListener('resize', syncViewport)
      window.visualViewport?.removeEventListener('resize', syncViewport)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || sheetHeight <= 0) return
    applySheetHeight(panelRef.current, sheetHeight)
  }, [isOpen, sheetHeight])

  useEffect(() => {
    if (panel !== 'highlight') return
    setHighlightDraft({
      underline: config.underlineHighlightColors,
      quote: config.quoteHighlightColors,
      circle: config.circleHighlightColors,
      pickerColor: config.highlightPickerColor,
    })
  }, [
    panel,
    config.underlineHighlightColors,
    config.quoteHighlightColors,
    config.circleHighlightColors,
    config.highlightPickerColor,
  ])

  const handlePointerMoveRef = useRef<(event: PointerEvent) => void>(() => {})
  const handlePointerEndRef = useRef<() => void>(() => {})

  const scheduleHeightState = (nextHeight: number) => {
    pendingHeightRef.current = nextHeight
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      setSheetHeight(pendingHeightRef.current)
    })
  }

  const onWindowPointerMove = (event: PointerEvent) => {
    handlePointerMoveRef.current(event)
  }

  const onWindowPointerEnd = () => {
    handlePointerEndRef.current()
  }

  handlePointerMoveRef.current = (event: PointerEvent) => {
    if (!resizeRef.current) return
    const delta = resizeRef.current.startY - event.clientY
    const nextHeight = clampSheetHeight(
      resizeRef.current.startHeight + delta,
      getViewportHeight(),
    )
    applySheetHeight(panelRef.current, nextHeight)
    scheduleHeightState(nextHeight)
  }

  handlePointerEndRef.current = () => {
    if (!resizeRef.current) return
    isDraggingRef.current = false
    resizeRef.current = null
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerEnd)
    window.removeEventListener('pointercancel', onWindowPointerEnd)

    const finalHeight = pendingHeightRef.current
    if (finalHeight > 0) {
      writeCachedSheetHeight(finalHeight)
      setSheetHeight(finalHeight)
    }
  }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerEnd)
      window.removeEventListener('pointercancel', onWindowPointerEnd)
    }
  }, [])

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    isDraggingRef.current = true
    const currentHeight =
      sheetHeight || panelRef.current?.getBoundingClientRect().height || readCachedSheetHeight()
    pendingHeightRef.current = currentHeight
    resizeRef.current = { startY: event.clientY, startHeight: currentHeight }
    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', onWindowPointerEnd)
    window.addEventListener('pointercancel', onWindowPointerEnd)
  }

  const handleClose = () => {
    if (panel === 'highlight') {
      onUpdate({
        underlineHighlightColors: highlightDraft.underline,
        quoteHighlightColors: highlightDraft.quote,
        circleHighlightColors: highlightDraft.circle,
        highlightPickerColor: highlightDraft.pickerColor,
      })
    }
    onOpenChange(false)
  }

  if (!isOpen) return null

  const panelBody = (
    <GraphicHighlightEditor
      markdown={markdown}
      config={config}
      underlineHighlightColors={highlightDraft.underline}
      quoteHighlightColors={highlightDraft.quote}
      circleHighlightColors={highlightDraft.circle}
      highlightPickerColor={highlightDraft.pickerColor}
      hideHeader
      onUnderlineChange={(colors) =>
        setHighlightDraft((current) => ({ ...current, underline: colors }))
      }
      onQuoteChange={(colors) =>
        setHighlightDraft((current) => ({ ...current, quote: colors }))
      }
      onCircleChange={(colors) =>
        setHighlightDraft((current) => ({ ...current, circle: colors }))
      }
      onPickerColorChange={(pickerColor) =>
        setHighlightDraft((current) => ({ ...current, pickerColor }))
      }
      onConfirm={handleClose}
      onBack={handleClose}
    />
  )

  return (
    <div
      ref={panelRef}
      className="graphic-config-sheet-inline graphic-config-drawer-dialog graphic-config-drawer-dialog--highlight component-library shrink-0"
      style={
        sheetHeight > 0
          ? { height: sheetHeight, maxHeight: sheetHeight }
          : undefined
      }
    >
      <button
        type="button"
        aria-label="关闭"
        className="graphic-sheet-close"
        onClick={handleClose}
      >
        <X size={18} />
      </button>
      <div
        className="graphic-config-sheet-handle"
        role="separator"
        aria-orientation="horizontal"
        aria-label="调节面板高度"
        onPointerDown={handleResizeStart}
      >
        <span className="graphic-config-sheet-handle-bar" />
      </div>
      <div className="graphic-config-sheet-body">
        <div className="graphic-config-sheet-highlight">{panelBody}</div>
      </div>
    </div>
  )
}
