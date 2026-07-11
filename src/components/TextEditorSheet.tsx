import { Drawer, Label, Slider, useOverlayState } from '@heroui/react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Italic,
  Keyboard,
  Palette,
  Strikethrough,
  Type,
  Underline,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PRESET_COLORS, STYLE_PRESETS } from '../data/editorPresets'
import { getFontById } from '../data/fonts'
import type { FontOption, TextDecoration, TextElement } from '../types'
import { ALIGN_OPTIONS } from '../types'
import { useFontLoader } from '../hooks/useFontLoader'
import { getPresetUpdates } from '../utils/textLayout'
import { FontGrid } from './FontGrid'
import { KeyboardEditorDock } from './KeyboardEditorDock'

type EditorTab = 'keyboard' | 'font' | 'style'

const PANEL_TABS: { id: EditorTab; label: string; icon: typeof Keyboard }[] = [
  { id: 'keyboard', label: '键盘', icon: Keyboard },
  { id: 'font', label: '字体', icon: Type },
  { id: 'style', label: '样式', icon: Palette },
]

function sliderValue(value: number | number[]) {
  return Array.isArray(value) ? value[0] : value
}

interface TextEditorSheetProps {
  text: TextElement | null
  isOpen: boolean
  canvasHeight: number
  onClose: (committed: boolean) => void
  onUpdate: (id: string, updates: Partial<TextElement>) => void
}

export function TextEditorSheet({
  text,
  isOpen,
  canvasHeight,
  onClose,
  onUpdate,
}: TextEditorSheetProps) {
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen

  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open && isOpenRef.current) onClose(false)
    },
  })
  const { isFontLoaded, loadingFonts, loadFont } = useFontLoader()
  const [activeTab, setActiveTab] = useState<EditorTab>('keyboard')
  const [fontError, setFontError] = useState<string | null>(null)
  const [fontSizeDraft, setFontSizeDraft] = useState(24)
  const [topDraft, setTopDraft] = useState(0)

  useEffect(() => {
    if (isOpen !== state.isOpen) {
      state.setOpen(isOpen)
    }
  }, [isOpen, state])

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
    if (isOpen) setActiveTab('keyboard')
  }, [isOpen, text?.id])

  useEffect(() => {
    if (!text) return
    setFontSizeDraft(text.fontSize)
    setTopDraft(Math.round(text.y))
  }, [text?.fontSize, text?.y, text?.id, text])

  useEffect(() => {
    if (!text || text.fontId !== 'dachun') return
    const font = getFontById('dachun')
    loadFont(font, text.content || '你好')
  }, [text?.content, text?.fontId, loadFont, text])

  if (!isOpen || !text) return null

  const maxTop = Math.max(0, Math.round(canvasHeight - 24))
  const isKeyboardTab = activeTab === 'keyboard'

  const handleFontSelect = async (font: FontOption) => {
    if (font.source !== 'system') {
      const ok = await loadFont(font, text.content || font.sample)
      if (!ok) {
        setFontError(`字体「${font.label}」加载失败，请重试`)
        return
      }
    }
    setFontError(null)
    onUpdate(text.id, { fontId: font.id, fontFamily: font.fontFamily })
  }

  const commitFontSize = (value: number) => {
    const size = Math.min(72, Math.max(12, Math.round(value)))
    setFontSizeDraft(size)
    onUpdate(text.id, { fontSize: size })
  }

  const commitTop = (value: number) => {
    const y = Math.min(Math.max(0, Math.round(value)), maxTop)
    setTopDraft(y)
    onUpdate(text.id, { y })
  }

  const toggleDecoration = (decoration: TextDecoration) => {
    onUpdate(text.id, {
      textDecoration: text.textDecoration === decoration ? 'none' : decoration,
    })
  }

  const handleCommit = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    onClose(true)
  }

  const handleTabSelect = (tab: EditorTab) => {
    setActiveTab(tab)
  }

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable={false} />

      {isKeyboardTab && (
        <KeyboardEditorDock
          text={text}
          onUpdate={onUpdate}
          onTabSelect={handleTabSelect}
          onCommit={handleCommit}
        />
      )}

      {!isKeyboardTab && (
        <Drawer.Content placement="bottom" className="component-library-content">
          <Drawer.Dialog className="component-library flex h-[min(520px,68dvh)] max-h-[min(520px,68dvh)] flex-col bg-white text-neutral-900">
            <div className="flex min-h-0 flex-col">
              <div className="component-library-header flex shrink-0 items-center justify-between px-4 py-2">
                <h2 className="text-sm font-medium text-neutral-900">组件库</h2>
                <button
                  type="button"
                  aria-label="完成"
                  className="component-done-btn"
                  onClick={handleCommit}
                >
                  <Check size={15} strokeWidth={2} />
                </button>
              </div>

              <div className="flex shrink-0 border-b border-neutral-200 px-2">
                {PANEL_TABS.map((tab) => {
                  const Icon = tab.icon
                  const selected = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`component-tab flex flex-1 flex-row items-center justify-center gap-1.5 py-2 ${
                        selected ? 'component-tab--active' : 'text-neutral-500'
                      }`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTabSelect(tab.id)
                      }}
                    >
                      <Icon size={16} strokeWidth={1.5} />
                      <span className="text-xs">{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              <Drawer.Body className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
                {activeTab === 'font' && (
                  <div className="flex flex-col gap-2">
                    <FontGrid
                      selectedFontId={text.fontId}
                      isFontLoaded={isFontLoaded}
                      isFontLoading={(id) => loadingFonts.has(id)}
                      onSelect={handleFontSelect}
                      onLoadFont={loadFont}
                    />
                    {fontError && <p className="text-xs text-red-500">{fontError}</p>}
                  </div>
                )}

                {activeTab === 'style' && (
                  <div className="flex flex-col gap-5">
                    <section>
                      <p className="mb-2.5 text-sm text-neutral-600">颜色</p>
                      <div className="component-scroll-row flex gap-3 overflow-x-auto py-1">
                        {PRESET_COLORS.map((color) => {
                          const selected = text.color.toUpperCase() === color.toUpperCase()
                          return (
                            <button
                              key={color}
                              type="button"
                              aria-label={`颜色 ${color}`}
                              className={`color-swatch-btn shrink-0 ${selected ? 'color-swatch-btn--selected' : ''}`}
                              onClick={() => onUpdate(text.id, { color })}
                            >
                              <span
                                className="color-swatch-inner"
                                style={{ backgroundColor: color }}
                              />
                            </button>
                          )
                        })}
                      </div>
                    </section>

                    <section>
                      <p className="mb-2.5 text-sm text-neutral-600">基础样式</p>
                      <div className="component-scroll-row component-style-row flex gap-2 overflow-x-auto py-1">
                        {STYLE_PRESETS.map((preset) => {
                          const selected = text.textStylePreset === preset.id
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              className={`style-preset-btn flex h-12 w-14 shrink-0 items-center justify-center rounded-lg text-sm ${
                                selected ? 'style-preset-btn--selected' : 'component-chip'
                              }`}
                              style={{
                                color: preset.previewColor,
                                backgroundColor: preset.previewBg ?? 'transparent',
                                border: preset.previewBorder,
                                WebkitTextStroke:
                                  preset.id === 'outline' ? '1.5px #000' : undefined,
                              }}
                              onClick={() => onUpdate(text.id, getPresetUpdates(preset.id))}
                            >
                              文字
                            </button>
                          )
                        })}
                      </div>
                    </section>

                    <section>
                      <p className="mb-2.5 text-sm text-neutral-600">文字修饰</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={`flex h-10 flex-1 items-center justify-center gap-1 rounded-lg text-sm ${
                            text.fontWeight === 700 ? 'style-preset-btn--selected' : 'component-chip'
                          }`}
                          onClick={() =>
                            onUpdate(text.id, { fontWeight: text.fontWeight === 700 ? 400 : 700 })
                          }
                        >
                          <Bold size={16} />
                          粗体
                        </button>
                        <button
                          type="button"
                          className={`flex h-10 flex-1 items-center justify-center rounded-lg ${
                            text.fontStyle === 'italic' ? 'style-preset-btn--selected' : 'component-chip'
                          }`}
                          onClick={() =>
                            onUpdate(text.id, {
                              fontStyle: text.fontStyle === 'italic' ? 'normal' : 'italic',
                            })
                          }
                        >
                          <Italic size={16} />
                        </button>
                        <button
                          type="button"
                          className={`flex h-10 flex-1 items-center justify-center rounded-lg ${
                            text.textDecoration === 'underline' ? 'style-preset-btn--selected' : 'component-chip'
                          }`}
                          onClick={() => toggleDecoration('underline')}
                        >
                          <Underline size={16} />
                        </button>
                        <button
                          type="button"
                          className={`flex h-10 flex-1 items-center justify-center rounded-lg ${
                            text.textDecoration === 'line-through' ? 'style-preset-btn--selected' : 'component-chip'
                          }`}
                          onClick={() => toggleDecoration('line-through')}
                        >
                          <Strikethrough size={16} />
                        </button>
                      </div>
                    </section>

                    <section>
                      <p className="mb-2.5 text-sm text-neutral-600">排列</p>
                      <div className="flex gap-2">
                        {[
                          { id: 'left' as const, icon: AlignLeft },
                          { id: 'center' as const, icon: AlignCenter },
                          { id: 'right' as const, icon: AlignRight },
                        ].map((opt) => {
                          const Icon = opt.icon
                          const selected = text.textAlign === opt.id
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              aria-label={ALIGN_OPTIONS.find((a) => a.id === opt.id)?.label}
                              className={`flex h-11 flex-1 items-center justify-center rounded-lg ${
                                selected ? 'style-preset-btn--selected' : 'component-chip'
                              }`}
                              onClick={() => onUpdate(text.id, { textAlign: opt.id })}
                            >
                              <Icon size={20} strokeWidth={1.5} />
                            </button>
                          )
                        })}
                      </div>
                    </section>

                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <Label className="text-sm text-neutral-600">字号</Label>
                        <span className="text-sm text-neutral-500">{fontSizeDraft}px</span>
                      </div>
                      <Slider
                        aria-label="字号"
                        minValue={12}
                        maxValue={72}
                        step={1}
                        value={fontSizeDraft}
                        onChange={(value) => {
                          const v = sliderValue(value)
                          setFontSizeDraft(v)
                          onUpdate(text.id, { fontSize: Math.min(72, Math.max(12, Math.round(v))) })
                        }}
                        onChangeEnd={(value) => commitFontSize(sliderValue(value))}
                        className="grey-slider"
                      >
                        <Slider.Track>
                          <Slider.Fill />
                          <Slider.Thumb />
                        </Slider.Track>
                      </Slider>
                    </section>

                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <Label className="text-sm text-neutral-600">距顶部</Label>
                        <span className="text-sm text-neutral-500">{topDraft}px</span>
                      </div>
                      <Slider
                        aria-label="距顶部"
                        minValue={0}
                        maxValue={maxTop}
                        step={1}
                        value={topDraft}
                        onChange={(value) => {
                          const v = sliderValue(value)
                          setTopDraft(v)
                          commitTop(v)
                        }}
                        onChangeEnd={(value) => commitTop(sliderValue(value))}
                        className="grey-slider"
                      >
                        <Slider.Track>
                          <Slider.Fill />
                          <Slider.Thumb />
                        </Slider.Track>
                      </Slider>
                    </section>
                  </div>
                )}
              </Drawer.Body>
            </div>
          </Drawer.Dialog>
        </Drawer.Content>
      )}
    </Drawer>
  )
}
