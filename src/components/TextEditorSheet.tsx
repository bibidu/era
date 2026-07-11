import { Button, Drawer, Input, Label, Slider, useOverlayState } from '@heroui/react'
import { Italic, Strikethrough, Underline } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFontLoader } from '../hooks/useFontLoader'
import type { FontOption, TextDecoration, TextElement } from '../types'
import { ALIGN_OPTIONS, normalizeColorHex } from '../types'
import { FONT_COUNT } from '../data/fonts'
import { FontSelect } from './FontSelect'
import { TextInputOverlay, TextInputTrigger } from './BottomTextInput'

interface TextEditorSheetProps {
  text: TextElement | null
  isOpen: boolean
  canvasHeight: number
  onClose: (committed: boolean) => void
  onUpdate: (id: string, updates: Partial<TextElement>) => void
  onDelete: (id: string) => void
}

export function TextEditorSheet({
  text,
  isOpen,
  canvasHeight,
  onClose,
  onUpdate,
  onDelete,
}: TextEditorSheetProps) {
  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open) onClose(false)
    },
  })
  const { isFontLoaded, loadingFonts, loadFont } = useFontLoader()
  const [textInputOpen, setTextInputOpen] = useState(false)
  const [textDraft, setTextDraft] = useState('')
  const [fontError, setFontError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen !== state.isOpen) {
      state.setOpen(isOpen)
    }
  }, [isOpen, state])

  useEffect(() => {
    if (!isOpen) {
      setTextInputOpen(false)
      document.body.classList.remove('text-input-open')
    }
  }, [isOpen])

  useEffect(() => {
    document.body.classList.toggle('text-input-open', textInputOpen)
    return () => document.body.classList.remove('text-input-open')
  }, [textInputOpen])

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

  const toggleDecoration = (decoration: TextDecoration) => {
    onUpdate(text.id, {
      textDecoration: text.textDecoration === decoration ? 'none' : decoration,
    })
  }

  const handleTopChange = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed)) return
    const y = Math.min(Math.max(0, parsed), maxTop)
    onUpdate(text.id, { y, textAlign: 'none' })
  }

  const handleOpenTextInput = () => {
    setTextDraft(text.content)
    setTextInputOpen(true)
  }

  const handleCommitTextInput = () => {
    setTextInputOpen(false)
    onUpdate(text.id, { content: textDraft })
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable={!textInputOpen}>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className={`flex max-h-[75dvh] flex-col ${textInputOpen ? 'pointer-events-none' : ''}`}>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading>编辑文本</Drawer.Heading>
            </Drawer.Header>

            <Drawer.Body className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2 pt-2">
              <div className="flex flex-col gap-1.5">
                <Label>文本内容</Label>
                <TextInputTrigger
                  value={text.content}
                  placeholder="点击输入文字内容"
                  onOpen={handleOpenTextInput}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>距顶部（px）</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={String(Math.round(text.y))}
                  onChange={(e) => handleTopChange(e.target.value)}
                  fullWidth
                  className="border-neutral-300"
                  aria-label="距顶部距离"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>字体（{FONT_COUNT} 种）</Label>
                <FontSelect
                  selectedFontId={text.fontId}
                  isFontLoaded={isFontLoaded}
                  isFontLoading={(id) => loadingFonts.has(id)}
                  onSelect={handleFontSelect}
                  onLoadFont={loadFont}
                />
                {fontError && <p className="text-xs text-red-600">{fontError}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <Label>样式</Label>
                <div className="flex gap-2">
                  <Button
                    variant={text.fontWeight === 400 ? 'primary' : 'secondary'}
                    className={`flex-1 ${text.fontWeight === 400 ? 'bg-black text-white' : 'border-neutral-300 bg-white text-black'}`}
                    onPress={() => onUpdate(text.id, { fontWeight: 400 })}
                  >
                    常规
                  </Button>
                  <Button
                    variant={text.fontWeight === 700 ? 'primary' : 'secondary'}
                    className={`flex-1 ${text.fontWeight === 700 ? 'bg-black text-white' : 'border-neutral-300 bg-white text-black'}`}
                    onPress={() => onUpdate(text.id, { fontWeight: 700 })}
                  >
                    粗体
                  </Button>
                  <Button
                    isIconOnly
                    variant={text.fontStyle === 'italic' ? 'primary' : 'secondary'}
                    className={text.fontStyle === 'italic' ? 'bg-black text-white' : 'border-neutral-300 bg-white text-black'}
                    aria-label="斜体"
                    onPress={() =>
                      onUpdate(text.id, {
                        fontStyle: text.fontStyle === 'italic' ? 'normal' : 'italic',
                      })
                    }
                  >
                    <Italic size={18} />
                  </Button>
                  <Button
                    isIconOnly
                    variant={text.textDecoration === 'underline' ? 'primary' : 'secondary'}
                    className={
                      text.textDecoration === 'underline'
                        ? 'bg-black text-white'
                        : 'border-neutral-300 bg-white text-black'
                    }
                    aria-label="下划线"
                    onPress={() => toggleDecoration('underline')}
                  >
                    <Underline size={18} />
                  </Button>
                  <Button
                    isIconOnly
                    variant={text.textDecoration === 'line-through' ? 'primary' : 'secondary'}
                    className={
                      text.textDecoration === 'line-through'
                        ? 'bg-black text-white'
                        : 'border-neutral-300 bg-white text-black'
                    }
                    aria-label="中划线"
                    onPress={() => toggleDecoration('line-through')}
                  >
                    <Strikethrough size={18} />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>对齐</Label>
                <div className="grid grid-cols-4 gap-2">
                  {ALIGN_OPTIONS.map((opt) => (
                    <Button
                      key={opt.id}
                      variant={text.textAlign === opt.id ? 'primary' : 'secondary'}
                      className={`min-w-0 ${
                        text.textAlign === opt.id
                          ? 'bg-black text-white'
                          : 'border-neutral-300 bg-white text-black'
                      }`}
                      onPress={() => onUpdate(text.id, { textAlign: opt.id })}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>字号</Label>
                  <span className="text-sm text-neutral-500">{text.fontSize}px</span>
                </div>
                <Slider
                  aria-label="字号"
                  minValue={12}
                  maxValue={72}
                  step={1}
                  value={text.fontSize}
                  onChange={(value) => onUpdate(text.id, { fontSize: value as number })}
                  className="grey-slider"
                >
                  <Slider.Track>
                    <Slider.Fill />
                    <Slider.Thumb />
                  </Slider.Track>
                </Slider>
              </div>

              <div className="flex flex-col gap-2">
                <Label>颜色</Label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-300 px-3 py-2.5">
                  <span
                    className="h-9 w-9 shrink-0 rounded-md border border-neutral-200"
                    style={{ backgroundColor: text.color }}
                  />
                  <span className="flex-1 font-mono text-sm text-neutral-700">
                    {normalizeColorHex(text.color)}
                  </span>
                  <input
                    type="color"
                    value={text.color.length === 7 ? text.color : '#000000'}
                    onChange={(e) => onUpdate(text.id, { color: e.target.value })}
                    className="sr-only"
                  />
                </label>
              </div>
            </Drawer.Body>

            <Drawer.Footer className="sheet-action-bar mt-auto flex shrink-0 gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button
                variant="secondary"
                className="flex-1 border-neutral-300 bg-white text-black"
                onPress={() => onDelete(text.id)}
              >
                删除
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-black text-white"
                onPress={() => onClose(true)}
              >
                完成
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>

          {textInputOpen && (
            <TextInputOverlay
              open={textInputOpen}
              draft={textDraft}
              placeholder="点击输入文字内容"
              onDraftChange={setTextDraft}
              onCommit={handleCommitTextInput}
            />
          )}
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
