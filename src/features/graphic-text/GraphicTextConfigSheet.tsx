import { Drawer, useOverlayState } from '@heroui/react'
import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { GraphicConfigPreview } from './GraphicConfigPreview'
import { GraphicHighlightEditor } from './GraphicHighlightEditor'
import { computeConfigPreviewLayout } from './graphicPreviewLayout'
import { type GraphicConfigPanel } from './graphicConfigPanels'
import { getGraphicLayout, paginateMarkdown } from './layout'
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
  showSafeArea: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
}

function applySheetLayout(
  dialogEl: HTMLElement | null,
  previewLayerEl: HTMLElement | null,
  sheetHeight: number,
  viewportHeight: number,
) {
  if (dialogEl) {
    dialogEl.style.height = `${sheetHeight}px`
    dialogEl.style.maxHeight = `${sheetHeight}px`
  }
  if (previewLayerEl) {
    previewLayerEl.style.height = `${Math.max(0, viewportHeight - sheetHeight)}px`
  }
}

export function GraphicTextConfigSheet({
  isOpen,
  panel,
  config,
  markdown,
  showSafeArea,
  onOpenChange,
  onUpdate,
}: GraphicTextConfigSheetProps) {
  const onCloseRef = useRef<() => void>(() => onOpenChange(false))
  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open) onCloseRef.current()
      else onOpenChange(true)
    },
  })
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const dialogElRef = useRef<HTMLElement | null>(null)
  const previewLayerRef = useRef<HTMLDivElement | null>(null)
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const isDraggingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const pendingHeightRef = useRef(0)
  const [viewportHeight, setViewportHeight] = useState(getViewportHeight)
  const [sheetHeight, setSheetHeight] = useState(0)
  const [highlightDraft, setHighlightDraft] = useState({
    underline: config.underlineHighlightColors,
    quote: config.quoteHighlightColors,
    circle: config.circleHighlightColors,
    pickerColor: config.highlightPickerColor,
  })

  const previewAreaHeight = Math.max(0, viewportHeight - sheetHeight)

  const previewPages = useMemo(() => paginateMarkdown(markdown, config), [markdown, config])
  const previewConfig = useMemo(
    () => ({
      ...config,
      underlineHighlightColors: highlightDraft.underline,
      quoteHighlightColors: highlightDraft.quote,
      circleHighlightColors: highlightDraft.circle,
      highlightPickerColor: highlightDraft.pickerColor,
    }),
    [config, highlightDraft],
  )
  const previewLayout = useMemo(() => {
    if (!previewAreaHeight) return null
    return computeConfigPreviewLayout(
      getGraphicLayout(config).aspectRatio,
      previewAreaHeight,
    )
  }, [config, previewAreaHeight])

  useEffect(() => {
    if (isOpen !== state.isOpen) {
      state.setOpen(isOpen)
    }
  }, [isOpen, state])

  useEffect(() => {
    if (!isOpen) return

    const syncViewport = () => {
      const nextViewport = getViewportHeight()
      setViewportHeight(nextViewport)
      if (!isDraggingRef.current) {
        setSheetHeight((current) => (current > 0 ? clampSheetHeight(current, nextViewport) : current))
      }
    }

    syncViewport()
    setSheetHeight(readCachedSheetHeight(getViewportHeight()))
    window.addEventListener('resize', syncViewport)
    window.visualViewport?.addEventListener('resize', syncViewport)

    return () => {
      window.removeEventListener('resize', syncViewport)
      window.visualViewport?.removeEventListener('resize', syncViewport)
    }
  }, [isOpen])

  useLayoutEffect(() => {
    dialogElRef.current =
      dialogRef.current?.querySelector<HTMLElement>('.graphic-config-drawer-dialog') ?? null
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen) {
      setSheetHeight(0)
      return
    }

    const dialog = dialogRef.current
    if (!dialog) return

    const updateHeight = () => {
      if (isDraggingRef.current) return
      const measured = dialog.getBoundingClientRect().height
      setSheetHeight(measured)
      applySheetLayout(dialogElRef.current, previewLayerRef.current, measured, getViewportHeight())
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(dialog)

    return () => observer.disconnect()
  }, [isOpen, panel, highlightDraft])

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

  const scheduleHeightState = (nextHeight: number, nextViewport: number) => {
    pendingHeightRef.current = nextHeight
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      setViewportHeight(nextViewport)
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
    const nextViewport = getViewportHeight()
    const nextHeight = clampSheetHeight(resizeRef.current.startHeight + delta, nextViewport)
    applySheetLayout(dialogElRef.current, previewLayerRef.current, nextHeight, nextViewport)
    scheduleHeightState(nextHeight, nextViewport)
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
      sheetHeight || dialogRef.current?.getBoundingClientRect().height || readCachedSheetHeight()
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

  onCloseRef.current = handleClose

  const previewNode =
    previewAreaHeight > 0 && previewLayout ? (
      <GraphicConfigPreview
        pages={previewPages}
        config={previewConfig}
        markdown={markdown}
        previewAreaHeight={previewAreaHeight}
        sourceWidth={previewLayout.sourceWidth}
        sourceHeight={previewLayout.sourceHeight}
        scale={previewLayout.scale}
        showSafeArea={showSafeArea}
      />
    ) : null

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

  const dialogStyle =
    sheetHeight > 0
      ? { height: sheetHeight, maxHeight: sheetHeight }
      : undefined

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable className="graphic-config-drawer-backdrop">
        {previewNode && previewLayout && (
          <div
            ref={previewLayerRef}
            className="graphic-config-preview-layer"
            style={{ height: previewAreaHeight }}
          >
            <button
              type="button"
              aria-label="关闭配置"
              className="graphic-config-preview-dismiss graphic-config-preview-dismiss-left"
              onClick={handleClose}
            />
            <div
              className="graphic-config-preview-center"
              style={{ width: previewLayout.width }}
            >
              {previewNode}
            </div>
            <button
              type="button"
              aria-label="关闭配置"
              className="graphic-config-preview-dismiss graphic-config-preview-dismiss-right"
              onClick={handleClose}
            />
          </div>
        )}
        <Drawer.Content placement="bottom" className="graphic-config-drawer-content">
          <div ref={dialogRef} className="w-full">
            <Drawer.Dialog
              className="graphic-config-drawer-dialog graphic-config-drawer-dialog--highlight component-library"
              style={dialogStyle}
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
            </Drawer.Dialog>
          </div>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
