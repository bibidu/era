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
import { useCallback, useEffect, useRef, useState } from 'react'
import { PRESET_COLORS, STYLE_PRESETS } from '../data/editorPresets'
import { getFontById } from '../data/fonts'
import type { FontOption, TextDecoration, TextElement } from '../types'
import { ALIGN_OPTIONS } from '../types'
import { useFontLoader } from '../hooks/useFontLoader'
import { getPresetUpdates } from '../utils/textLayout'
import { FontGrid } from './FontGrid'

type EditorTab = 'keyboard' | 'font' | 'style'

const TABS: { id: EditorTab; label: string; icon: typeof Keyboard }[] = [
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
  const [keyboardInset, setKeyboardInset] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const focusTimerRef = useRef<number | null>(null)

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

  const focusKeyboardInput = useCallback(() => {
    if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current)
    focusTimerRef.current = window.setTimeout(() => {
      const el = inputRef.current
      if (!el || activeTab !== 'keyboard' || !isOpenRef.current) return
      el.focus({ preventScroll: true })
      const end = el.value.length
      el.setSelectionRange(end, end)
    }, 180)
  }, [activeTab])

  useEffect(() => {
    if (!isOpen || activeTab !== 'keyboard') return
    focusKeyboardInput()
    return () => {
      if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current)
    }
  }, [isOpen, activeTab, focusKeyboardInput, text?.id])

  useEffect(() => {
    if (!text || text.fontId !== 'dachun') return
    const font = getFontById('dachun')
    loadFont(font, text.content || '你好')
  }, [text?.content, text?.fontId, loadFont, text])

  useEffect(() => {
    if (!isOpen) return
    const content = dialogRef.current?.closest('.component-library-content') as HTMLElement | null
    const viewport = window.visualViewport
    if (!content || !viewport) return

    const pinSheet = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      setKeyboardInset(inset)
    }

    pinSheet()
    viewport.addEventListener('resize', pinSheet)
    viewport.addEventListener('scroll', pinSheet)
    return () => {
      viewport.removeEventListener('resize', pinSheet)
      viewport.removeEventListener('scroll', pinSheet)
      setKeyboardInset(0)
    }
  }, [isOpen])

  if (!text) return null

  const maxTop = Math.max(0, Math.round(canvasHeight - 24))

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
    if (tab !== 'keyboard' && inputRef.current) {
      inputRef.current.blur()
    }
    setActiveTab(tab)
    if (tab === 'keyboard') focusKeyboardInput()
  }

  const isKeyboardTab = activeTab === 'keyboard'

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable={false}>
        <Drawer.Content placement="bottom" className="component-library-content">
          <Drawer.Dialog
            className={`component-library flex flex-col bg-[#1a1a1a] text-white ${
              isKeyboardTab
                ? 'component-library--keyboard'
                : 'h-[min(520px,68dvh)] max-h-[min(520px,68dvh)]'
            }`}
          >
            <div ref={dialogRef} className="flex min-h-0 flex-col">
              <div className="component-library-header flex shrink-0 items-center justify-between px-4 py-2">
                <h2 className="text-sm font-medium text-white">组件库</h2>
                <button
                  type="button"
                  aria-label="完成"
                  className="component-done-btn"
                  onClick={handleCommit}
                >
                  <Check size={15} strokeWidth={2} />
                </button>
              </div>

              <div className="flex shrink-0 border-b border-neutral-700 px-2">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const selected = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`component-tab flex flex-1 flex-row items-center justify-center gap-1.5 py-2 ${
                        selected ? 'component-tab--active' : 'text-neutral-400'
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

              {isKeyboardTab ? (
                <div
                  className="component-keyboard-bar shrink-0 px-4 py-3"
                  style={{
                    paddingBottom: keyboardInset > 0
                      ? '0.75rem'
                      : 'max(0.75rem, env(safe-area-inset-bottom))',
                  }}
                >
                  <textarea
                    ref={inputRef}
                    value={text.content}
                    onChange={(e) => onUpdate(text.id, { content: e.target.value })}
                    placeholder="输入文字"
                    rows={3}
                    inputMode="text"
                    enterKeyHint="done"
                    autoComplete="off"
                    autoCorrect="on"
                    spellCheck
                    className="component-keyboard-input w-full resize-none rounded-xl border border-neutral-600 bg-[#2a2a2a] px-3 py-3 text-base text-white outline-none placeholder:text-neutral-500"
                    style={{
                      fontSize: '16px',
                      WebkitUserSelect: 'text',
                      userSelect: 'text',
                      fontFamily: text.fontFamily,
                    }}
                  />
                </div>
              ) : (
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
                    {fontError && <p className="text-xs text-red-400">{fontError}</p>}
                  </div>
                )}

                {activeTab === 'style' && (
                  <div className="flex flex-col gap-5">
                    <section>
                      <p className="mb-2.5 text-sm text-neutral-300">颜色</p>
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
                      <p className="mb-2.5 text-sm text-neutral-300">基础样式</p>
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
                                  preset.id === 'outline' ? '1.5px #fff' : undefined,
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
                      <p className="mb-2.5 text-sm text-neutral-300">文字修饰</p>
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
                      <p className="mb-2.5 text-sm text-neutral-300">排列</p>
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
                        <Label className="text-sm text-neutral-300">字号</Label>
                        <span className="text-sm text-neutral-400">{fontSizeDraft}px</span>
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
                        className="dark-slider"
                      >
                        <Slider.Track>
                          <Slider.Fill />
                          <Slider.Thumb />
                        </Slider.Track>
                      </Slider>
                    </section>

                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <Label className="text-sm text-neutral-300">距顶部</Label>
                        <span className="text-sm text-neutral-400">{topDraft}px</span>
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
                        className="dark-slider"
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
              )}
            </div>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
