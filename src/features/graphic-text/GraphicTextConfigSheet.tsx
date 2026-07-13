import { Drawer, useOverlayState } from '@heroui/react'
import { Check, Highlighter, ImagePlus, Palette, ScanEye, Type } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FONT_OPTIONS } from '../../data/fonts'
import { GreySlider } from '../../components/GreySlider'
import { GraphicHighlightEditor } from './GraphicHighlightEditor'
import { GraphicPage } from './GraphicPage'
import { computeGraphicPageDisplaySize } from './graphicPreviewLayout'
import { getGraphicLayout, paginateMarkdown } from './layout'
import type { GraphicTemplate, GraphicTextConfig } from './types'
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

const TEMPLATE_OPTIONS: { id: GraphicTemplate; label: string }[] = [
  { id: 'reference', label: '参考图' },
  { id: 'solid', label: '纯色纸张' },
  { id: 'grid', label: '网格纸' },
]

const THEME_COLORS = ['#FACC15', '#FB923C', '#EF4444', '#22C55E', '#3B82F6', '#A855F7']

function optionButtonClass(selected: boolean, heightClass = 'h-10') {
  return `${heightClass} rounded-xl border text-sm ${
    selected
      ? 'border-2 border-black bg-white text-neutral-900'
      : 'border border-neutral-300 bg-white text-neutral-700'
  }`
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
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen

  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open && isOpenRef.current) onOpenChange(false)
    },
  })
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const [sheetNode, setSheetNode] = useState<HTMLDivElement | null>(null)
  const [previewAreaHeight, setPreviewAreaHeight] = useState(0)
  const [previewReady, setPreviewReady] = useState(false)
  const [showSafeArea, setShowSafeArea] = useState(false)
  const [sheetView, setSheetView] = useState<ConfigSheetView>('main')
  const [highlightDraft, setHighlightDraft] = useState<string[]>(config.highlightedCharKeys)
  const stableCountRef = useRef(0)
  const lastHeightRef = useRef(0)

  const previewPages = useMemo(() => paginateMarkdown(markdown, config), [markdown, config])
  const previewLayout = useMemo(() => getGraphicLayout(config), [config])
  const previewPageSize = useMemo(() => {
    if (!previewAreaHeight) return null
    return computeGraphicPageDisplaySize(
      previewLayout.aspectRatio,
      window.innerWidth - 32,
      previewAreaHeight - 16,
    )
  }, [previewLayout.aspectRatio, previewAreaHeight])

  useEffect(() => {
    if (isOpen !== state.isOpen) state.setOpen(isOpen)
  }, [isOpen, state])

  useEffect(() => {
    if (!isOpen) {
      setSheetView('main')
      setPreviewReady(false)
      setPreviewAreaHeight(0)
      stableCountRef.current = 0
      lastHeightRef.current = 0
    }
  }, [isOpen])

  useEffect(() => {
    if (sheetView === 'highlight') {
      setHighlightDraft(config.highlightedCharKeys)
    }
  }, [sheetView, config.highlightedCharKeys])

  useEffect(() => {
    if (!isOpen) return
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isOpenRef.current) {
        state.setOpen(true)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isOpen, state])

  useEffect(() => {
    if (!isOpen) return

    const updatePreviewBounds = () => {
      const anchor =
        sheetNode?.closest('.drawer__dialog') ??
        sheetRef.current ??
        sheetNode
      if (!anchor) return
      const sheetTop = anchor.getBoundingClientRect().top
      if (sheetTop <= 0) return

      if (Math.abs(sheetTop - lastHeightRef.current) < 1) {
        stableCountRef.current += 1
      } else {
        stableCountRef.current = 0
        lastHeightRef.current = sheetTop
        setPreviewReady(false)
      }

      setPreviewAreaHeight(sheetTop)
      if (stableCountRef.current >= 2) {
        setPreviewReady(true)
      }
    }

    updatePreviewBounds()
    const raf1 = window.requestAnimationFrame(updatePreviewBounds)
    const raf2 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(updatePreviewBounds)
    })
    const timer = window.setInterval(updatePreviewBounds, 100)

    const observer = new ResizeObserver(updatePreviewBounds)
    if (sheetNode) observer.observe(sheetNode)
    const dialog = sheetNode?.closest('.drawer__dialog')
    if (dialog) observer.observe(dialog)

    window.addEventListener('resize', updatePreviewBounds)
    window.addEventListener('scroll', updatePreviewBounds, true)
    window.visualViewport?.addEventListener('resize', updatePreviewBounds)
    window.visualViewport?.addEventListener('scroll', updatePreviewBounds)

    return () => {
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
      window.clearInterval(timer)
      observer.disconnect()
      window.removeEventListener('resize', updatePreviewBounds)
      window.removeEventListener('scroll', updatePreviewBounds, true)
      window.visualViewport?.removeEventListener('resize', updatePreviewBounds)
      window.visualViewport?.removeEventListener('scroll', updatePreviewBounds)
    }
  }, [isOpen, sheetNode])

  const handleGenerate = () => {
    onOpenChange(false)
    onGenerate()
  }

  const handleHighlightConfirm = () => {
    onUpdate({ highlightedCharKeys: highlightDraft })
    setSheetView('main')
  }

  const previewNode =
    previewReady && previewAreaHeight > 0 && previewPageSize ? (
      <div className="graphic-config-preview" style={{ height: previewAreaHeight }}>
        <div className="graphic-config-preview-pager graphic-pager flex snap-x snap-mandatory">
          {previewPages.map((page) => (
            <div key={page.index} className="graphic-config-preview-slide">
              <GraphicPage
                page={page}
                config={config}
                markdown={markdown}
                showSafeArea={showSafeArea}
                displayWidth={previewPageSize.width}
                className="rounded-xl shadow-lg"
              />
            </div>
          ))}
        </div>
      </div>
    ) : null

  return (
    <>
      {isOpen && previewNode && createPortal(previewNode, document.body)}

      <Drawer state={state}>
        <Drawer.Backdrop isDismissable={false} className="graphic-config-backdrop">
          <Drawer.Content placement="bottom" className="component-library-content">
            <Drawer.Dialog className="component-library flex h-[min(520px,68dvh)] max-h-[68dvh] flex-col bg-white text-neutral-900">
              <div
                ref={(node) => {
                  sheetRef.current = node
                  setSheetNode(node)
                }}
                className="flex min-h-0 flex-1 flex-col"
              >
                {sheetView === 'highlight' ? (
                  <GraphicHighlightEditor
                    markdown={markdown}
                    themeColor={config.themeColor}
                    highlightedCharKeys={highlightDraft}
                    onChange={setHighlightDraft}
                    onConfirm={handleHighlightConfirm}
                    onBack={() => setSheetView('main')}
                  />
                ) : (
                  <>
                    <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2">
                      <Drawer.Heading className="text-sm font-semibold">生成配置</Drawer.Heading>
                      <button
                        type="button"
                        aria-label="关闭"
                        className="component-done-btn"
                        onClick={() => onOpenChange(false)}
                      >
                        <Check size={15} />
                      </button>
                    </div>

                    <Drawer.Body className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                      <div className="flex flex-col gap-5 pb-2">
                        <section>
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                            <Type size={16} />
                            字体配置
                          </div>
                          <select
                            value={config.fontId}
                            onChange={(event) => {
                              const font = FONT_OPTIONS.find((item) => item.id === event.target.value)
                              if (font) onUpdate({ fontId: font.id, fontFamily: font.fontFamily })
                            }}
                            className="h-11 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 text-sm outline-none focus:border-neutral-500"
                          >
                            {FONT_OPTIONS.map((font) => (
                              <option key={font.id} value={font.id}>
                                {font.label}
                              </option>
                            ))}
                          </select>
                        </section>

                        <section>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium">标题字号</span>
                            <span className="text-neutral-500">{config.titleFontSize}px</span>
                          </div>
                          <GreySlider
                            aria-label="标题字号"
                            minValue={24}
                            maxValue={56}
                            value={config.titleFontSize}
                            onChange={(value) => onUpdate({ titleFontSize: value })}
                          />
                        </section>

                        <section>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium">正文字号</span>
                            <span className="text-neutral-500">{config.bodyFontSize}px</span>
                          </div>
                          <GreySlider
                            aria-label="正文字号"
                            minValue={14}
                            maxValue={32}
                            value={config.bodyFontSize}
                            onChange={(value) => onUpdate({ bodyFontSize: value })}
                          />
                        </section>

                        <section>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium">标题行高</span>
                            <span className="text-neutral-500">{config.titleLineHeight.toFixed(2)}</span>
                          </div>
                          <GreySlider
                            aria-label="标题行高"
                            minValue={1}
                            maxValue={2}
                            step={0.02}
                            value={config.titleLineHeight}
                            onChange={(value) => onUpdate({ titleLineHeight: value })}
                          />
                        </section>

                        <section>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium">正文行高</span>
                            <span className="text-neutral-500">{config.bodyLineHeight.toFixed(2)}</span>
                          </div>
                          <GreySlider
                            aria-label="正文行高"
                            minValue={1}
                            maxValue={2.2}
                            step={0.02}
                            value={config.bodyLineHeight}
                            onChange={(value) => onUpdate({ bodyLineHeight: value })}
                          />
                        </section>

                        <section>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium">二级标题上间距</span>
                            <span className="text-neutral-500">{config.headingMarginTop.toFixed(2)}</span>
                          </div>
                          <GreySlider
                            aria-label="二级标题上间距"
                            minValue={0}
                            maxValue={1.2}
                            step={0.02}
                            value={config.headingMarginTop}
                            onChange={(value) => onUpdate({ headingMarginTop: value })}
                          />
                        </section>

                        <section>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium">二级标题下间距</span>
                            <span className="text-neutral-500">{config.headingMarginBottom.toFixed(2)}</span>
                          </div>
                          <GreySlider
                            aria-label="二级标题下间距"
                            minValue={0}
                            maxValue={1.2}
                            step={0.02}
                            value={config.headingMarginBottom}
                            onChange={(value) => onUpdate({ headingMarginBottom: value })}
                          />
                        </section>

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
                            <label className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-300 bg-white">
                              <input
                                type="color"
                                value={config.themeColor}
                                onChange={(event) => onUpdate({ themeColor: event.target.value })}
                                className="absolute inset-[-8px] size-14 cursor-pointer"
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
                              已选 {config.highlightedCharKeys.length} 字
                            </span>
                          </button>
                        </section>

                        <section>
                          <p className="mb-2 text-sm font-medium">图片比例</p>
                          <div className="grid grid-cols-3 gap-2">
                            {GRAPHIC_ASPECT_RATIO_OPTIONS.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                className={optionButtonClass(config.aspectRatio === option.id)}
                                onClick={() => onUpdate({ aspectRatio: option.id })}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </section>

                        <section>
                          <div className="flex items-center justify-between gap-3">
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
                          <p className="mt-1 text-xs text-neutral-500">
                            开启后预览区会用虚线标出正文排版范围
                          </p>
                        </section>

                        <section>
                          <p className="mb-2 text-sm font-medium">页面模板</p>
                          <div className="grid grid-cols-3 gap-2">
                            {TEMPLATE_OPTIONS.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                className={optionButtonClass(config.template === option.id, 'h-11')}
                                onClick={() => onUpdate({ template: option.id })}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </section>

                        {config.template === 'reference' && (
                          <section>
                            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                              <ImagePlus size={16} />
                              参考图背景
                            </div>
                            <label className="flex min-h-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0]
                                  if (file) onBackgroundUpload(file)
                                  event.target.value = ''
                                }}
                              />
                              {config.backgroundUrl ? (
                                <img
                                  src={config.backgroundUrl}
                                  alt="参考图"
                                  className="h-32 w-full object-cover"
                                />
                              ) : (
                                <span className="text-sm text-neutral-500">上传参考图</span>
                              )}
                            </label>
                          </section>
                        )}

                        <section>
                          <p className="mb-2 text-sm font-medium">顶部文案</p>
                          <input
                            value={config.topText}
                            onChange={(event) => onUpdate({ topText: event.target.value })}
                            placeholder="留空则显示「全文 xxx 字」"
                            className="h-10 w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 text-sm outline-none"
                          />
                        </section>
                      </div>
                    </Drawer.Body>

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
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  )
}
