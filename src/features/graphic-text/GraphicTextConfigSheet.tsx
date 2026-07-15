import { Drawer, useOverlayState } from '@heroui/react'
import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { GraphicConfigPreview } from './GraphicConfigPreview'
import { GraphicHighlightEditor } from './GraphicHighlightEditor'
import { computeConfigPreviewLayout } from './graphicPreviewLayout'
import { type GraphicConfigPanel } from './graphicConfigPanels'
import { getGraphicLayout, paginateMarkdown } from './layout'
import { getViewportHeight } from './topBar'
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
    () =>
      panel === 'highlight'
        ? {
            ...config,
            underlineHighlightColors: highlightDraft.underline,
            quoteHighlightColors: highlightDraft.quote,
            circleHighlightColors: highlightDraft.circle,
            highlightPickerColor: highlightDraft.pickerColor,
          }
        : config,
    [config, panel, highlightDraft],
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

    const syncViewport = () => setViewportHeight(getViewportHeight())

    syncViewport()
    window.addEventListener('resize', syncViewport)
    window.visualViewport?.addEventListener('resize', syncViewport)

    return () => {
      window.removeEventListener('resize', syncViewport)
      window.visualViewport?.removeEventListener('resize', syncViewport)
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen) {
      setSheetHeight(0)
      return
    }

    const dialog = dialogRef.current
    if (!dialog) return

    const updateHeight = () => {
      setSheetHeight(dialog.getBoundingClientRect().height)
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(dialog)

    return () => observer.disconnect()
  }, [isOpen, panel, highlightDraft, config.topText])

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

  const panelBody = (() => {
    switch (panel) {
      case 'highlight':
        return (
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
      case 'top-text':
        return (
          <label className="flex items-center gap-2 text-sm">
            <span className="w-[4.6rem] shrink-0 font-medium text-neutral-600">顶部文案</span>
            <input
              value={config.topText}
              onChange={(event) => onUpdate({ topText: event.target.value })}
              placeholder="留空则显示「全文 xxx 字」"
              className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-2 text-sm outline-none"
            />
          </label>
        )
      default:
        return null
    }
  })()

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable className="graphic-config-drawer-backdrop">
        {previewNode && previewLayout && (
          <div className="graphic-config-preview-layer" style={{ height: previewAreaHeight }}>
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
        <Drawer.Content placement="bottom">
          <div ref={dialogRef}>
            <Drawer.Dialog
              className={`graphic-config-drawer-dialog component-library ${
                panel === 'highlight'
                  ? 'graphic-config-drawer-dialog--highlight'
                  : 'graphic-config-drawer-dialog--compact'
              }`}
            >
            <button
              type="button"
              aria-label="关闭"
              className="graphic-sheet-close"
              onClick={handleClose}
            >
              <X size={18} />
            </button>
            <div className="graphic-config-sheet-handle" aria-hidden>
              <span className="graphic-config-sheet-handle-bar" />
            </div>
            <div className="graphic-config-sheet-body">
              {panel === 'highlight' ? (
                <div className="graphic-config-sheet-highlight">{panelBody}</div>
              ) : (
                <div className="graphic-config-sheet-compact">{panelBody}</div>
              )}
            </div>
          </Drawer.Dialog>
          </div>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
