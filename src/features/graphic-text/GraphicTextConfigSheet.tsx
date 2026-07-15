import { Drawer, useOverlayState } from '@heroui/react'
import { Check, ScanEye } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { FONT_OPTIONS } from '../../data/fonts'
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
import {
  GRAPHIC_CONFIG_PANEL_TITLES,
  type GraphicConfigPanel,
} from './graphicConfigPanels'
import { getGraphicLayout, paginateMarkdown } from './layout'
import {
  clampSheetHeight,
  getViewportHeight,
  readCachedSheetHeight,
  writeCachedSheetHeight,
} from './topBar'
import type { GraphicTextConfig } from './types'
import { GRAPHIC_ASPECT_RATIO_OPTIONS } from './types'

interface GraphicTextConfigSheetProps {
  isOpen: boolean
  panel: GraphicConfigPanel
  config: GraphicTextConfig
  markdown: string
  onOpenChange: (open: boolean) => void
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
  onBackgroundUpload: (file: File) => void
}

const PAPER_COLORS = [
  '#FBF7ED',
  '#FFF8F0',
  '#FEFCE8',
  '#ECFDF5',
  '#EFF6FF',
  '#FDF2F8',
  '#FAF5FF',
  '#F5F5F4',
]

const selectClassName =
  'h-9 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-2 text-sm outline-none focus:border-neutral-500'

function TemplatePreviewSquare({
  children,
  className = '',
  compact = false,
}: {
  children?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 ${
        compact ? 'size-8' : 'size-11'
      } ${className}`}
    >
      {children}
    </div>
  )
}

function templateOptionButtonClass(selected: boolean) {
  return `inline-flex h-11 shrink-0 items-center gap-2.5 rounded-xl border px-3 text-sm ${
    selected
      ? 'border-2 border-black bg-white text-neutral-900'
      : 'border border-neutral-300 bg-white text-neutral-700'
  }`
}

function parseAspectNumbers(id: string) {
  const [width, height] = id.split(':').map(Number)
  return { width, height }
}

function aspectPreviewSize(id: string, maxDim = 30) {
  const { width, height } = parseAspectNumbers(id)
  const scale = maxDim / Math.max(width, height)
  return { width: width * scale, height: height * scale }
}

function nearestOption(value: number, options: readonly number[]) {
  return options.reduce((closest, option) =>
    Math.abs(option - value) < Math.abs(closest - value) ? option : closest,
  )
}

function AspectRatioOption({
  id,
  label,
  selected,
  onSelect,
}: {
  id: string
  label: string
  selected: boolean
  onSelect: () => void
}) {
  const preview = aspectPreviewSize(id)
  return (
    <button
      type="button"
      aria-label={`图片比例 ${label}`}
      className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 ${
        selected ? 'text-neutral-900' : 'text-neutral-600'
      }`}
      onClick={onSelect}
    >
      <div
        className={`flex items-center justify-center rounded-md border bg-white ${
          selected ? 'border-2 border-black' : 'border border-neutral-300'
        }`}
        style={{ width: preview.width + 12, height: preview.height + 12 }}
      >
        <div
          className={`rounded-sm ${selected ? 'bg-neutral-900' : 'bg-neutral-300'}`}
          style={{ width: preview.width, height: preview.height }}
        />
      </div>
      <span className="text-[11px] leading-none">{label}</span>
    </button>
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
  onOpenChange,
  onUpdate,
  onBackgroundUpload,
}: GraphicTextConfigSheetProps) {
  const state = useOverlayState({ isOpen, onOpenChange })
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const referenceInputRef = useRef<HTMLInputElement | null>(null)
  const solidPickerRef = useRef<HTMLDivElement | null>(null)
  const [viewportHeight, setViewportHeight] = useState(getViewportHeight)
  const [sheetHeight, setSheetHeight] = useState(readCachedSheetHeight)
  const [showSafeArea, setShowSafeArea] = useState(false)
  const [solidColorPickerOpen, setSolidColorPickerOpen] = useState(false)
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
    if (!solidColorPickerOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!solidPickerRef.current?.contains(event.target as Node)) {
        setSolidColorPickerOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [solidColorPickerOpen])

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

  const handleHighlightConfirm = () => {
    onUpdate({
      underlineHighlightColors: highlightDraft.underline,
      quoteHighlightColors: highlightDraft.quote,
      circleHighlightColors: highlightDraft.circle,
      highlightPickerColor: highlightDraft.pickerColor,
    })
    onOpenChange(false)
  }

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
            onConfirm={handleHighlightConfirm}
            onBack={() => onOpenChange(false)}
          />
        )
      case 'font':
        return (
          <select
            value={config.fontId}
            onChange={(event) => {
              const font = FONT_OPTIONS.find((item) => item.id === event.target.value)
              if (font) onUpdate({ fontId: font.id, fontFamily: font.fontFamily })
            }}
            className="h-10 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-500"
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font.id} value={font.id}>
                {font.label}
              </option>
            ))}
          </select>
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
      case 'aspect':
        return (
          <>
            <div className="flex items-center">
              <p className="flex-1 text-center text-sm font-medium">图片比例</p>
              <div className="h-4 w-px shrink-0 bg-neutral-200" aria-hidden />
              <p className="flex-1 text-center text-sm font-medium">
                <span className="inline-flex items-center justify-center gap-2">
                  <ScanEye size={16} />
                  文字安全区
                </span>
              </p>
            </div>
            <div className="mt-3 flex items-stretch">
              <div className="flex min-w-0 flex-1 items-center justify-center">
                <div className="component-scroll-row flex items-end gap-0.5 overflow-x-auto">
                  {GRAPHIC_ASPECT_RATIO_OPTIONS.map((option) => (
                    <AspectRatioOption
                      key={option.id}
                      id={option.id}
                      label={option.label}
                      selected={config.aspectRatio === option.id}
                      onSelect={() => onUpdate({ aspectRatio: option.id })}
                    />
                  ))}
                </div>
              </div>
              <div className="mx-3 w-px shrink-0 self-stretch bg-neutral-200" aria-hidden />
              <div className="flex min-w-0 flex-1 items-center justify-center">
                <button
                  type="button"
                  className={`h-8 shrink-0 rounded-full border px-3 text-xs font-medium ${
                    showSafeArea
                      ? 'border-2 border-black bg-white text-neutral-900'
                      : 'border border-neutral-300 bg-white text-neutral-600'
                  }`}
                  onClick={() => setShowSafeArea((current) => !current)}
                >
                  {showSafeArea ? '隐藏线框' : '查看线框'}
                </button>
              </div>
            </div>
          </>
        )
      case 'template':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={referenceInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onBackgroundUpload(file)
                event.target.value = ''
              }}
            />
            <button
              type="button"
              className={templateOptionButtonClass(config.backgroundType === 'reference')}
              onClick={() => {
                onUpdate({ backgroundType: 'reference' })
                referenceInputRef.current?.click()
              }}
            >
              <span>参考图</span>
              <TemplatePreviewSquare compact>
                {config.backgroundUrl ? (
                  <img
                    src={config.backgroundUrl}
                    alt="参考图预览"
                    className="size-full object-cover"
                  />
                ) : null}
              </TemplatePreviewSquare>
            </button>

            <div ref={solidPickerRef} className="relative shrink-0">
              {solidColorPickerOpen && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
                  <div className="component-scroll-row flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                    {PAPER_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`纸张色 ${color}`}
                        className={`size-7 shrink-0 rounded-full border-2 ${
                          config.paperColor === color ? 'border-black' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          onUpdate({
                            backgroundType: 'solid',
                            paperColor: color,
                          })
                          setSolidColorPickerOpen(false)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <button
                type="button"
                className={templateOptionButtonClass(config.backgroundType === 'solid')}
                onClick={() => {
                  onUpdate({ backgroundType: 'solid' })
                  setSolidColorPickerOpen((current) => !current)
                }}
              >
                <span>纯色纸张</span>
                <TemplatePreviewSquare compact>
                  <span
                    className="size-full"
                    style={{ backgroundColor: config.paperColor }}
                    aria-hidden
                  />
                </TemplatePreviewSquare>
              </button>
            </div>

            <button
              type="button"
              aria-label="方格块"
              aria-pressed={config.pageOverlay === 'grid'}
              className={`inline-flex shrink-0 rounded-xl p-0.5 ${
                config.pageOverlay === 'grid' ? 'border-2 border-black' : 'border border-neutral-300'
              }`}
              onClick={() =>
                onUpdate({
                  pageOverlay: config.pageOverlay === 'grid' ? 'none' : 'grid',
                })
              }
            >
              <TemplatePreviewSquare compact className="graphic-grid-preview" />
            </button>

            <button
              type="button"
              aria-label="像素边框"
              aria-pressed={config.pageOverlay === 'pixel'}
              className={`inline-flex shrink-0 rounded-xl p-0.5 ${
                config.pageOverlay === 'pixel' ? 'border-2 border-black' : 'border border-neutral-300'
              }`}
              onClick={() =>
                onUpdate({
                  pageOverlay: config.pageOverlay === 'pixel' ? 'none' : 'pixel',
                })
              }
            >
              <TemplatePreviewSquare compact className="graphic-pixel-preview" />
            </button>
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
          panelBody
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2">
              <p className="text-sm font-semibold">{GRAPHIC_CONFIG_PANEL_TITLES[panel]}</p>
              <button
                type="button"
                aria-label="关闭"
                className="component-done-btn"
                onClick={() => onOpenChange(false)}
              >
                <Check size={15} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <div className="flex flex-col gap-4 pb-2">{panelBody}</div>
            </div>
          </>
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
              onClick={() => onOpenChange(false)}
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
              onClick={() => onOpenChange(false)}
            />
          </div>
        )}
        <Drawer.Content placement="bottom">
          <Drawer.Dialog
            className="graphic-config-drawer-dialog component-library"
            style={{ height: sheetHeight, maxHeight: sheetHeight }}
          >
            {sheetContent}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
