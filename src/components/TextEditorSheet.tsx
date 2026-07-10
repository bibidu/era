import { Button, Drawer, Input, Label, Slider, useOverlayState } from '@heroui/react'
import { Italic, Strikethrough, Underline } from 'lucide-react'
import { useEffect } from 'react'
import { useFontLoader } from '../hooks/useFontLoader'
import type { FontOption, TextDecoration, TextElement } from '../types'
import { ALIGN_OPTIONS, normalizeColorHex } from '../types'
import { FontSelect } from './FontSelect'

interface TextEditorSheetProps {
  text: TextElement | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, updates: Partial<TextElement>) => void
  onDelete: (id: string) => void
}

export function TextEditorSheet({
  text,
  isOpen,
  onOpenChange,
  onUpdate,
  onDelete,
}: TextEditorSheetProps) {
  const state = useOverlayState({ isOpen, onOpenChange })
  const { isFontLoaded, loadingFonts, loadFont } = useFontLoader()

  useEffect(() => {
    if (isOpen !== state.isOpen) {
      state.setOpen(isOpen)
    }
  }, [isOpen, state])

  if (!text) return null

  const handleFontSelect = async (font: FontOption) => {
    if (font.source === 'google' && !isFontLoaded(font)) {
      const ok = await loadFont(font)
      if (!ok) return
    }
    onUpdate(text.id, { fontId: font.id, fontFamily: font.fontFamily })
  }

  const toggleDecoration = (decoration: TextDecoration) => {
    onUpdate(text.id, {
      textDecoration: text.textDecoration === decoration ? 'none' : decoration,
    })
  }

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="max-h-[75dvh]">
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading>编辑文本</Drawer.Heading>
            </Drawer.Header>

            <div className="sheet-action-bar flex gap-2 px-4 py-3">
              <Button
                variant="secondary"
                className="flex-1 border-neutral-300 bg-white text-black"
                onPress={() => {
                  onDelete(text.id)
                  onOpenChange(false)
                }}
              >
                删除
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-black text-white"
                onPress={() => onOpenChange(false)}
              >
                完成
              </Button>
            </div>

            <Drawer.Body className="flex flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
              <div className="flex flex-col gap-1.5">
                <Label>文本内容</Label>
                <Input
                  value={text.content}
                  onChange={(e) => onUpdate(text.id, { content: e.target.value })}
                  placeholder="输入文字内容"
                  fullWidth
                  className="border-neutral-300"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>字体</Label>
                <FontSelect
                  selectedFontId={text.fontId}
                  isFontLoaded={isFontLoaded}
                  isFontLoading={(id) => loadingFonts.has(id)}
                  onSelect={handleFontSelect}
                  onLoadFont={loadFont}
                />
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
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
