import { Check, Highlighter, Palette, ScanEye, Type } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  config: GraphicTextConfig
  markdown: string
  onOpenChange: (open: boolean) => void
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
  onGenerate: () => void
  onBackgroundUpload: (file: File) => void
}

type ConfigSheetView = 'main' | 'highlight'

const THEME_COLORS = ['#FACC15', '#FB923C', '#EF4444', '#22C55E', '#3B82F6', '#A855F7']

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
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 ${className}`}
    >
      {children}
    </div>
  )
}

function optionButtonClass(selected: boolean, heightClass = 'h-10') {
  return `${heightClass} rounded-xl border text-sm ${
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
  config,
  markdown,
  onOpenChange,
  onUpdate,
  onGenerate,
  onBackgroundUpload,
}: GraphicTextConfigSheetProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const referenceInputRef = useRef<HTMLInputElement | null>(null)
  const solidPickerRef = useRef<HTMLDivElement | null>(null)
  const [viewportHeight, setViewportHeight] = useState(getViewportHeight)
  const [sheetHeight, setSheetHeight] = useState(readCachedSheetHeight)
  const [showSafeArea, setShowSafeArea] = useState(false)
  const [sheetView, setSheetView] = useState<ConfigSheetView>('main')
  const [solidColorPickerOpen, setSolidColorPickerOpen] = useState(false)
  const [highlightDraft, setHighlightDraft] = useState({
    underline: config.underlineHighlightedCharKeys,
    quote: config.quoteHighlightedCharKeys,
    circle: config.circleHighlightedCharKeys,
  })

  const previewAreaHeight = Math.max(0, viewportHeight - sheetHeight)

  const previewPages = useMemo(() => paginateMarkdown(markdown, config), [markdown, config])
  const previewConfig = useMemo(
    () =>
      sheetView === 'highlight'
        ? {
            ...config,
            underlineHighlightedCharKeys: highlightDraft.underline,
            quoteHighlightedCharKeys: highlightDraft.quote,
            circleHighlightedCharKeys: highlightDraft.circle,
          }
        : config,
    [config, sheetView, highlightDraft],
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
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setSheetView('main')
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
    if (sheetView === 'highlight') {
      setHighlightDraft({
        underline: config.underlineHighlightedCharKeys,
        quote: config.quoteHighlightedCharKeys,
        circle: config.circleHighlightedCharKeys,
      })
    }
  }, [
    sheetView,
    config.underlineHighlightedCharKeys,
    config.quoteHighlightedCharKeys,
    config.circleHighlightedCharKeys,
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

  const handleGenerate = () => {
    onGenerate()
  }

  const handleHighlightConfirm = () => {
    onUpdate({
      underlineHighlightedCharKeys: highlightDraft.underline,
      quoteHighlightedCharKeys: highlightDraft.quote,
      circleHighlightedCharKeys: highlightDraft.circle,
    })
    setSheetView('main')
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

  if (!isOpen) return null

  const isCustomThemeColor = !THEME_COLORS.includes(config.themeColor)

  const sheetContent = (
    <div
      ref={sheetRef}
      className="graphic-config-sheet-panel component-library"
      style={{ height: sheetHeight }}
    >
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
        {sheetView === 'highlight' ? (
          <GraphicHighlightEditor
            markdown={markdown}
            config={config}
            themeColor={config.themeColor}
            underlineHighlightedCharKeys={highlightDraft.underline}
            quoteHighlightedCharKeys={highlightDraft.quote}
            circleHighlightedCharKeys={highlightDraft.circle}
            onUnderlineChange={(keys) =>
              setHighlightDraft((current) => ({ ...current, underline: keys }))
            }
            onQuoteChange={(keys) =>
              setHighlightDraft((current) => ({ ...current, quote: keys }))
            }
            onCircleChange={(keys) =>
              setHighlightDraft((current) => ({ ...current, circle: keys }))
            }
            onConfirm={handleHighlightConfirm}
            onBack={() => setSheetView('main')}
          />
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2">
              <p className="text-sm font-semibold">生成配置</p>
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
                      <div className="flex flex-col gap-4 pb-2">
                        <section>
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                            <Palette size={16} />
                            主题色
                          </div>
                          <div className="flex items-center gap-3 overflow-x-auto py-1">
                            {THEME_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                aria-label={`主题色 ${color}`}
                                className={`size-9 shrink-0 rounded-full border-2 ${
                                  config.themeColor === color ? 'border-black' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => onUpdate({ themeColor: color })}
                              />
                            ))}
                            <label
                              className={`theme-color-palette-btn relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border ${
                                isCustomThemeColor ? 'border-2 border-black' : 'border-neutral-300'
                              }`}
                            >
                              <input
                                type="color"
                                value={config.themeColor}
                                onChange={(event) => onUpdate({ themeColor: event.target.value })}
                                className="absolute inset-[-8px] size-14 cursor-pointer opacity-0"
                                aria-label="自定义主题色"
                              />
                            </label>
                          </div>
                        </section>

                        <section>
                          <button
                            type="button"
                            className="flex h-11 w-full items-center justify-between rounded-xl border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900"
                            onClick={() => setSheetView('highlight')}
                          >
                            <span className="flex items-center gap-2">
                              <Highlighter size={16} />
                              高亮设置
                            </span>
                            <span className="text-xs text-neutral-500">
                              已选{' '}
                              {config.underlineHighlightedCharKeys.length +
                                config.quoteHighlightedCharKeys.length +
                                config.circleHighlightedCharKeys.length}{' '}
                              字
                            </span>
                          </button>
                        </section>

                        <section>
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                            <Type size={16} />
                            字体
                          </div>
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
                        </section>

                        <section className="flex flex-col gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <ConfigSelect
                              label="标题"
                              labelClassName="w-9"
                              value={config.titleFontSize}
                              options={TITLE_FONT_SIZE_OPTIONS}
                              onChange={(value) => onUpdate({ titleFontSize: value })}
                              format={(value) => `${value}px`}
                            />
                            <ConfigSelect
                              label="标题行高"
                              value={config.titleLineHeight}
                              options={TITLE_LINE_HEIGHT_OPTIONS}
                              onChange={(value) => onUpdate({ titleLineHeight: value })}
                            />
                          </div>
                          <div className="flex min-w-0 items-center gap-2">
                            <ConfigSelect
                              label="二级"
                              labelClassName="w-9"
                              value={config.headingFontSize}
                              options={HEADING_FONT_SIZE_OPTIONS}
                              onChange={(value) => onUpdate({ headingFontSize: value })}
                              format={(value) => `${value}px`}
                            />
                          </div>
                          <div className="flex min-w-0 items-center gap-2">
                            <ConfigSelect
                              label="正文"
                              labelClassName="w-9"
                              value={config.bodyFontSize}
                              options={BODY_FONT_SIZE_OPTIONS}
                              onChange={(value) => onUpdate({ bodyFontSize: value })}
                              format={(value) => `${value}px`}
                            />
                            <ConfigSelect
                              label="正文行高"
                              value={config.bodyLineHeight}
                              options={BODY_LINE_HEIGHT_OPTIONS}
                              onChange={(value) => onUpdate({ bodyLineHeight: value })}
                            />
                          </div>
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
                        </section>

                        <section>
                          <div className="flex items-end justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="mb-2 text-sm font-medium">图片比例</p>
                              <div className="component-scroll-row flex items-end gap-0.5 overflow-x-auto py-1">
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
                            <div className="flex shrink-0 flex-col items-end gap-2 pb-1">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <ScanEye size={16} />
                                文字安全区
                              </div>
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
                        </section>

                        <section>
                          <p className="mb-2 text-sm font-medium">页面模板</p>

                          <div className="mb-3">
                            <p className="mb-2 text-xs font-medium text-neutral-500">背景</p>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
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
                                  className={`${optionButtonClass(config.backgroundType === 'reference', 'h-11')} min-w-0 flex-1 px-3`}
                                  onClick={() => {
                                    onUpdate({ backgroundType: 'reference' })
                                    referenceInputRef.current?.click()
                                  }}
                                >
                                  参考图
                                </button>
                                <TemplatePreviewSquare>
                                  {config.backgroundUrl ? (
                                    <img
                                      src={config.backgroundUrl}
                                      alt="参考图预览"
                                      className="size-full object-cover"
                                    />
                                  ) : null}
                                </TemplatePreviewSquare>
                              </div>

                              <div ref={solidPickerRef} className="relative flex items-center gap-3">
                                <button
                                  type="button"
                                  className={`${optionButtonClass(config.backgroundType === 'solid', 'h-11')} min-w-0 flex-1 px-3`}
                                  onClick={() => setSolidColorPickerOpen((current) => !current)}
                                >
                                  纯色纸张
                                </button>
                                <TemplatePreviewSquare>
                                  <span
                                    className="size-full"
                                    style={{ backgroundColor: config.paperColor }}
                                    aria-hidden
                                  />
                                </TemplatePreviewSquare>
                                {solidColorPickerOpen && (
                                  <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[min(100%,240px)] rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
                                    <div className="flex flex-wrap gap-2">
                                      {PAPER_COLORS.map((color) => (
                                        <button
                                          key={color}
                                          type="button"
                                          aria-label={`纸张色 ${color}`}
                                          className={`size-9 rounded-full border-2 ${
                                            config.paperColor === color
                                              ? 'border-black'
                                              : 'border-transparent'
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
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-medium text-neutral-500">参数</p>
                            <button
                              type="button"
                              className={`${optionButtonClass(config.showGrid, 'h-11')} w-full px-3`}
                              onClick={() => onUpdate({ showGrid: !config.showGrid })}
                            >
                              网格纸
                            </button>
                          </div>
                        </section>

                        <section>
                          <label className="flex items-center gap-2 text-sm">
                            <span className="w-[4.6rem] shrink-0 font-medium text-neutral-600">顶部文案</span>
                            <input
                              value={config.topText}
                              onChange={(event) => onUpdate({ topText: event.target.value })}
                              placeholder="留空则显示「全文 xxx 字」"
                              className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-2 text-sm outline-none"
                            />
                          </label>
                        </section>
                      </div>
            </div>

            <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                className="h-12 w-full rounded-xl bg-black text-sm font-semibold text-white active:bg-neutral-800"
                onClick={handleGenerate}
              >
                生成图文
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(
    <div className="graphic-config-root">
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
      {sheetContent}
    </div>,
    document.body,
  )
}
