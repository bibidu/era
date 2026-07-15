import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { GraphicHighlightEditor } from './GraphicHighlightEditor'
import { type GraphicConfigPanel } from './graphicConfigPanels'
import {
  clampSheetHeight,
  getViewportHeight,
  readCachedSheetHeight,
  writeCachedSheetHeight,
} from './topBar'
import type { GraphicTextConfig } from './types'

export interface HighlightPreviewDraft {
  underlineHighlightColors: GraphicTextConfig['underlineHighlightColors']
  quoteHighlightColors: GraphicTextConfig['quoteHighlightColors']
  circleHighlightColors: GraphicTextConfig['circleHighlightColors']
  highlightPickerColor: GraphicTextConfig['highlightPickerColor']
}

interface GraphicTextConfigSheetProps {
  isOpen: boolean
  panel: GraphicConfigPanel
  config: GraphicTextConfig
  markdown: string
  sheetHeight: number
  toolbarDockHeight: number
  highlightDraft: HighlightPreviewDraft
  onOpenChange: (open: boolean) => void
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
  onHeightChange: (height: number) => void
  onHighlightDraftChange: (draft: HighlightPreviewDraft) => void
}

function applySheetHeight(panelEl: HTMLElement | null, sheetHeight: number) {
  if (!panelEl) return
  panelEl.style.height = `${sheetHeight}px`
  panelEl.style.maxHeight = `${sheetHeight}px`
}

export function createHighlightPreviewDraft(
  config: GraphicTextConfig,
): HighlightPreviewDraft {
  return {
    underlineHighlightColors: config.underlineHighlightColors,
    quoteHighlightColors: config.quoteHighlightColors,
    circleHighlightColors: config.circleHighlightColors,
    highlightPickerColor: config.highlightPickerColor,
  }
}

export function GraphicTextConfigSheet({
  isOpen,
  panel,
  config,
  markdown,
  sheetHeight,
  toolbarDockHeight,
  highlightDraft,
  onOpenChange,
  onUpdate,
  onHeightChange,
  onHighlightDraftChange,
}: GraphicTextConfigSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const isDraggingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const pendingHeightRef = useRef(sheetHeight)

  useEffect(() => {
    if (!isOpen) return

    const syncViewport = () => {
      if (isDraggingRef.current) return
      const nextHeight = clampSheetHeight(sheetHeight, getViewportHeight())
      if (nextHeight !== sheetHeight) {
        onHeightChange(nextHeight)
      }
    }

    window.addEventListener('resize', syncViewport)
    window.visualViewport?.addEventListener('resize', syncViewport)

    return () => {
      window.removeEventListener('resize', syncViewport)
      window.visualViewport?.removeEventListener('resize', syncViewport)
    }
  }, [isOpen, onHeightChange, sheetHeight])

  useEffect(() => {
    if (!isOpen || sheetHeight <= 0) return
    applySheetHeight(panelRef.current, sheetHeight)
  }, [isOpen, sheetHeight])

  const handlePointerMoveRef = useRef<(event: PointerEvent) => void>(() => {})
  const handlePointerEndRef = useRef<() => void>(() => {})

  const scheduleHeightChange = (nextHeight: number) => {
    pendingHeightRef.current = nextHeight
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      onHeightChange(pendingHeightRef.current)
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
    scheduleHeightChange(nextHeight)
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
      onHeightChange(finalHeight)
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
        underlineHighlightColors: highlightDraft.underlineHighlightColors,
        quoteHighlightColors: highlightDraft.quoteHighlightColors,
        circleHighlightColors: highlightDraft.circleHighlightColors,
        highlightPickerColor: highlightDraft.highlightPickerColor,
      })
    }
    onOpenChange(false)
  }

  if (!isOpen) return null

  const panelBody = (
    <GraphicHighlightEditor
      markdown={markdown}
      config={config}
      underlineHighlightColors={highlightDraft.underlineHighlightColors}
      quoteHighlightColors={highlightDraft.quoteHighlightColors}
      circleHighlightColors={highlightDraft.circleHighlightColors}
      highlightPickerColor={highlightDraft.highlightPickerColor}
      hideHeader
      onUnderlineChange={(colors) =>
        onHighlightDraftChange({ ...highlightDraft, underlineHighlightColors: colors })
      }
      onQuoteChange={(colors) =>
        onHighlightDraftChange({ ...highlightDraft, quoteHighlightColors: colors })
      }
      onCircleChange={(colors) =>
        onHighlightDraftChange({ ...highlightDraft, circleHighlightColors: colors })
      }
      onPickerColorChange={(highlightPickerColor) =>
        onHighlightDraftChange({ ...highlightDraft, highlightPickerColor })
      }
      onConfirm={handleClose}
      onBack={handleClose}
    />
  )

  return (
    <div
      ref={panelRef}
      className="graphic-config-sheet-fixed graphic-config-sheet-inline graphic-config-drawer-dialog graphic-config-drawer-dialog--highlight component-library"
      style={{
        height: sheetHeight,
        maxHeight: sheetHeight,
        bottom: toolbarDockHeight,
      }}
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
