import { Drawer, useOverlayState } from '@heroui/react'
import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GraphicConfigPreview } from './GraphicConfigPreview'
import { GraphicHighlightEditor } from './GraphicHighlightEditor'
import {
  BODY_FONT_SIZE_OPTIONS,
  BODY_LINE_HEIGHT_OPTIONS,
  HEADING_FONT_SIZE_OPTIONS,
  HEADING_MARGIN_OPTIONS,
  TITLE_FONT_SIZE_OPTIONS,
  TITLE_LINE_HEIGHT_OPTIONS,
  TITLE_MARGIN_OPTIONS,
} from './configSelectOptions'
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

const selectClassName =
  'h-9 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-2 text-sm outline-none focus:border-neutral-500'

function nearestOption(value: number, options: readonly number[]) {
  return options.reduce((closest, option) =>
    Math.abs(option - value) < Math.abs(closest - value) ? option : closest,
  )
}

interface ConfigSelectProps {
  label: string
  value: number
  options: readonly number[]
  onChange: (value: number) => void
  format?: (value: number) => string
  labelClassName?: string
}

function ConfigSelect({
  label,
  value,
  options,
  onChange,
  format,
  labelClassName = 'w-[4.6rem]',
}: ConfigSelectProps) {
  const displayValue = nearestOption(value, options)
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
      <span className={`${labelClassName} shrink-0 text-neutral-600`}>{label}</span>
      <select
        value={displayValue}
        onChange={(event) => onChange(Number(event.target.value))}
        className={selectClassName}
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {format ? format(option) : option}
          </option>
        ))}
      </select>
    </label>
  )
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
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const [viewportHeight, setViewportHeight] = useState(getViewportHeight)
  const [sheetHeight, setSheetHeight] = useState(readCachedSheetHeight)
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
    if (!isOpen) {
      return
    }

    const syncViewport = () => {
      const nextViewport = getViewportHeight()
      setViewportHeight(nextViewport)
      setSheetHeight((current) => clampSheetHeight(current, nextViewport))
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

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    resizeRef.current = { startY: event.clientY, startHeight: sheetHeight }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return
    const delta = resizeRef.current.startY - event.clientY
    const nextViewport = getViewportHeight()
    const nextHeight = clampSheetHeight(resizeRef.current.startHeight + delta, nextViewport)
    setViewportHeight(nextViewport)
    setSheetHeight(nextHeight)
    writeCachedSheetHeight(nextHeight)
  }

  const handleResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    resizeRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
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
      case 'font-size':
        return (
          <div className="flex flex-col gap-2">
            <ConfigSelect
              label="标题"
              labelClassName="w-9"
              value={config.titleFontSize}
              options={TITLE_FONT_SIZE_OPTIONS}
              onChange={(value) => onUpdate({ titleFontSize: value })}
              format={(value) => `${value}px`}
            />
            <ConfigSelect
              label="二级"
              labelClassName="w-9"
              value={config.headingFontSize}
              options={HEADING_FONT_SIZE_OPTIONS}
              onChange={(value) => onUpdate({ headingFontSize: value })}
              format={(value) => `${value}px`}
            />
            <ConfigSelect
              label="正文"
              labelClassName="w-9"
              value={config.bodyFontSize}
              options={BODY_FONT_SIZE_OPTIONS}
              onChange={(value) => onUpdate({ bodyFontSize: value })}
              format={(value) => `${value}px`}
            />
          </div>
        )
      case 'text-style':
        return (
          <div className="flex flex-col gap-2">
            <ConfigSelect
              label="标题行高"
              value={config.titleLineHeight}
              options={TITLE_LINE_HEIGHT_OPTIONS}
              onChange={(value) => onUpdate({ titleLineHeight: value })}
            />
            <ConfigSelect
              label="正文行高"
              value={config.bodyLineHeight}
              options={BODY_LINE_HEIGHT_OPTIONS}
              onChange={(value) => onUpdate({ bodyLineHeight: value })}
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <ConfigSelect
                label="一级上间距"
                value={config.titleMarginTop}
                options={TITLE_MARGIN_OPTIONS}
                onChange={(value) => onUpdate({ titleMarginTop: value })}
              />
              <ConfigSelect
                label="一级下间距"
                value={config.titleMarginBottom}
                options={TITLE_MARGIN_OPTIONS}
                onChange={(value) => onUpdate({ titleMarginBottom: value })}
              />
              <ConfigSelect
                label="二级上间距"
                value={config.headingMarginTop}
                options={HEADING_MARGIN_OPTIONS}
                onChange={(value) => onUpdate({ headingMarginTop: value })}
              />
              <ConfigSelect
                label="二级下间距"
                value={config.headingMarginBottom}
                options={HEADING_MARGIN_OPTIONS}
                onChange={(value) => onUpdate({ headingMarginBottom: value })}
              />
            </div>
          </div>
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

  const sheetContent = (
    <div ref={sheetRef} className="flex min-h-0 flex-1 flex-col">
      <div
        className="graphic-config-sheet-handle"
        role="separator"
        aria-orientation="horizontal"
        aria-label="调节面板高度"
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
      >
        <span className="graphic-config-sheet-handle-bar" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {panel === 'highlight' ? (
          <div className="flex min-h-0 flex-1 flex-col">{panelBody}</div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-10">
            <div className="flex flex-col gap-4 pb-2">{panelBody}</div>
          </div>
        )}
      </div>
    </div>
  )

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
          <Drawer.Dialog
            className="graphic-config-drawer-dialog component-library"
            style={{ height: sheetHeight, maxHeight: sheetHeight }}
          >
            <button
              type="button"
              aria-label="关闭"
              className="graphic-sheet-close"
              onClick={handleClose}
            >
              <X size={18} />
            </button>
            {sheetContent}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
