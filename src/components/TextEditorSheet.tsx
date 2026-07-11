import { Drawer, Input, Label, Slider, useOverlayState } from '@heroui/react'
import { AlignCenter, AlignLeft, AlignRight, Check, Keyboard, Palette, Type } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PRESET_COLORS, STYLE_PRESETS } from '../data/editorPresets'
import type { FontOption, TextElement } from '../types'
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
  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open) onClose(false)
    },
  })
  const { isFontLoaded, loadingFonts, loadFont } = useFontLoader()
  const [activeTab, setActiveTab] = useState<EditorTab>('keyboard')
  const [fontError, setFontError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen !== state.isOpen) {
      state.setOpen(isOpen)
    }
  }, [isOpen, state])

  useEffect(() => {
    if (isOpen) setActiveTab('keyboard')
  }, [isOpen, text?.id])

  useEffect(() => {
    if (!isOpen || activeTab !== 'keyboard') return
    const el = inputRef.current
    if (!el) return
    const timer = window.setTimeout(() => {
      el.focus({ preventScroll: true })
      const end = el.value.length
      el.setSelectionRange(end, end)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [isOpen, activeTab])

  useEffect(() => {
    if (!isOpen) return
    const content = dialogRef.current?.closest('.component-library-content') as HTMLElement | null
    const viewport = window.visualViewport
    if (!content || !viewport) return

    const pinToBottom = () => {
      content.style.transform = 'translate3d(0, 0, 0)'
      content.style.bottom = '0px'
    }

    pinToBottom()
    viewport.addEventListener('resize', pinToBottom)
    viewport.addEventListener('scroll', pinToBottom)
    return () => {
      viewport.removeEventListener('resize', pinToBottom)
      viewport.removeEventListener('scroll', pinToBottom)
      content.style.transform = ''
      content.style.bottom = ''
    }
  }, [isOpen])

  if (!text) return null

  const maxTop = Math.max(0, Math.round(canvasHeight - 24))

  const handleFontSelect = async (font: FontOption) => {
    if ((font.source === 'google' || font.source === 'pixel') && !isFontLoaded(font)) {
      const ok = await loadFont(font)
      if (!ok) {
        setFontError(`字体「${font.label}」加载失败，请重试`)
        return
      }
    }
    setFontError(null)
    onUpdate(text.id, { fontId: font.id, fontFamily: font.fontFamily })
  }

  const handleTopChange = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed)) return
    const y = Math.min(Math.max(0, parsed), maxTop)
    onUpdate(text.id, { y })
  }

  const handleCommit = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    onClose(true)
  }

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable>
        <Drawer.Content placement="bottom" className="component-library-content">
          <Drawer.Dialog className="component-library flex h-[min(420px,52dvh)] max-h-[min(420px,52dvh)] flex-col bg-[#1a1a1a] text-white">
            <div ref={dialogRef} className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
              <h2 className="text-base font-semibold text-white">组件库</h2>
              <button
                type="button"
                aria-label="完成"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black"
                onClick={handleCommit}
              >
                <Check size={18} strokeWidth={2.5} />
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
                    className={`component-tab flex flex-1 flex-col items-center gap-1 py-2.5 ${
                      selected ? 'component-tab--active' : 'text-neutral-400'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={18} strokeWidth={1.5} />
                    <span className="text-xs">{tab.label}</span>
                  </button>
                )
              })}
            </div>

            <Drawer.Body className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
              {activeTab === 'keyboard' && (
                <textarea
                  ref={inputRef}
                  value={text.content}
                  onChange={(e) => onUpdate(text.id, { content: e.target.value })}
                  placeholder="输入文字"
                  rows={4}
                  inputMode="text"
                  enterKeyHint="done"
                  autoComplete="off"
                  autoCorrect="on"
                  spellCheck
                  className="w-full resize-none rounded-xl border border-neutral-600 bg-[#2a2a2a] px-3 py-3 text-base text-white outline-none placeholder:text-neutral-500"
                  style={{ fontSize: '16px', WebkitUserSelect: 'text', userSelect: 'text' }}
                />
              )}

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
                    <div className="component-scroll-row flex gap-2.5 overflow-x-auto pb-1">
                      {PRESET_COLORS.map((color) => {
                        const selected = text.color.toUpperCase() === color.toUpperCase()
                        return (
                          <button
                            key={color}
                            type="button"
                            aria-label={`颜色 ${color}`}
                            className={`h-9 w-9 shrink-0 rounded-full border-2 ${
                              selected ? 'border-white' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => onUpdate(text.id, { color })}
                          />
                        )
                      })}
                    </div>
                  </section>

                  <section>
                    <p className="mb-2.5 text-sm text-neutral-300">基础样式</p>
                    <div className="component-scroll-row flex gap-2 overflow-x-auto pb-1">
                      {STYLE_PRESETS.map((preset) => {
                        const selected = text.textStylePreset === preset.id
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            className={`flex h-12 w-14 shrink-0 items-center justify-center rounded-lg text-sm ${
                              selected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : 'component-chip'
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
                              selected ? 'ring-2 ring-white' : 'component-chip'
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
                      <span className="text-sm text-neutral-400">{text.fontSize}px</span>
                    </div>
                    <Slider
                      aria-label="字号"
                      minValue={12}
                      maxValue={72}
                      step={1}
                      value={text.fontSize}
                      onChange={(value) => onUpdate(text.id, { fontSize: value as number })}
                      className="dark-slider"
                    >
                      <Slider.Track>
                        <Slider.Fill />
                        <Slider.Thumb />
                      </Slider.Track>
                    </Slider>
                  </section>

                  <section>
                    <Label className="mb-2 block text-sm text-neutral-300">距顶部（px）</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={String(Math.round(text.y))}
                      onChange={(e) => handleTopChange(e.target.value)}
                      fullWidth
                      className="component-input"
                      aria-label="距顶部距离"
                    />
                  </section>
                </div>
              )}
            </Drawer.Body>
            </div>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
