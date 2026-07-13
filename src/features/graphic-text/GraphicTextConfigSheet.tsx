import { Drawer, useOverlayState } from '@heroui/react'
import { Check, ImagePlus, Palette, Type } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { FONT_OPTIONS } from '../../data/fonts'
import { GreySlider } from '../../components/GreySlider'
import { GraphicPage } from './GraphicPage'
import { paginateMarkdown } from './layout'
import type { EdgeStyle, GraphicTemplate, GraphicTextConfig } from './types'

interface GraphicTextConfigSheetProps {
  isOpen: boolean
  config: GraphicTextConfig
  markdown: string
  onOpenChange: (open: boolean) => void
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
  onGenerate: () => void
  onBackgroundUpload: (file: File) => void
}

const TEMPLATE_OPTIONS: { id: GraphicTemplate; label: string }[] = [
  { id: 'reference', label: '参考图' },
  { id: 'solid', label: '纯色纸张' },
  { id: 'grid', label: '网格纸' },
]

const EDGE_OPTIONS: { id: EdgeStyle; label: string }[] = [
  { id: 'minimal', label: '极简' },
  { id: 'bar', label: '色块' },
  { id: 'outline', label: '描边' },
]

const THEME_COLORS = ['#FACC15', '#FB923C', '#EF4444', '#22C55E', '#3B82F6', '#A855F7']

export function GraphicTextConfigSheet({
  isOpen,
  config,
  markdown,
  onOpenChange,
  onUpdate,
  onGenerate,
  onBackgroundUpload,
}: GraphicTextConfigSheetProps) {
  const state = useOverlayState({ isOpen, onOpenChange })
  const previewPage = useMemo(() => {
    const pages = paginateMarkdown(markdown, config)
    return pages[0] ?? { index: 0, blocks: [] }
  }, [markdown, config])

  useEffect(() => {
    if (state.isOpen !== isOpen) state.setOpen(isOpen)
  }, [isOpen, state])

  const handleGenerate = () => {
    onOpenChange(false)
    onGenerate()
  }

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable className="graphic-config-backdrop">
        <div className="graphic-config-preview pointer-events-none flex min-h-0 flex-1 items-center justify-center px-4 pt-4">
          <GraphicPage
            page={previewPage}
            config={config}
            className="graphic-config-preview-page max-h-full w-[min(100%,17.5rem)] shadow-xl"
          />
        </div>

        <Drawer.Content placement="bottom" className="component-library-content">
          <Drawer.Dialog className="component-library flex h-[min(520px,68dvh)] max-h-[68dvh] flex-col bg-white text-neutral-900">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-3">
                <div>
                  <Drawer.Heading className="text-base font-semibold">生成配置</Drawer.Heading>
                  <p className="mt-0.5 text-xs text-neutral-500">上方可实时预览，正文用 [[重点]] 标记主题色</p>
                </div>
                <button
                  type="button"
                  aria-label="关闭"
                  className="component-done-btn"
                  onClick={() => onOpenChange(false)}
                >
                  <Check size={15} />
                </button>
              </div>

              <Drawer.Body className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="flex flex-col gap-6 pb-3">
                  <section>
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
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

                  <section className="touch-none">
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

                  <section className="touch-none">
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
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
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
                    <p className="mb-3 text-sm font-medium">页面模板</p>
                    <div className="grid grid-cols-3 gap-2">
                      {TEMPLATE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`h-11 rounded-xl border text-sm ${
                            config.template === option.id
                              ? 'border-black bg-black text-white'
                              : 'border-neutral-300 bg-white text-neutral-700'
                          }`}
                          onClick={() => onUpdate({ template: option.id })}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
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

                  <EdgeSetting
                    label="顶部样式"
                    value={config.topStyle}
                    text={config.topText}
                    onStyleChange={(topStyle) => onUpdate({ topStyle })}
                    onTextChange={(topText) => onUpdate({ topText })}
                  />
                  <EdgeSetting
                    label="底部样式"
                    value={config.bottomStyle}
                    text={config.bottomText}
                    onStyleChange={(bottomStyle) => onUpdate({ bottomStyle })}
                    onTextChange={(bottomText) => onUpdate({ bottomText })}
                  />
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
            </div>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}

interface EdgeSettingProps {
  label: string
  value: EdgeStyle
  text: string
  onStyleChange: (style: EdgeStyle) => void
  onTextChange: (text: string) => void
}

function EdgeSetting({
  label,
  value,
  text,
  onStyleChange,
  onTextChange,
}: EdgeSettingProps) {
  return (
    <section>
      <p className="mb-3 text-sm font-medium">{label}</p>
      <div className="mb-2 grid grid-cols-3 gap-2">
        {EDGE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`h-10 rounded-lg border text-sm ${
              value === option.id
                ? 'border-black bg-neutral-100 text-black'
                : 'border-neutral-300 bg-white text-neutral-600'
            }`}
            onClick={() => onStyleChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <input
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder={`${label}文字`}
        className="h-10 w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 text-sm outline-none"
      />
    </section>
  )
}
