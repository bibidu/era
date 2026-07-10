import { Button, Drawer, Input, Label, Slider, useOverlayState } from '@heroui/react'
import { useEffect } from 'react'
import { useFontLoader } from '../hooks/useFontLoader'
import type { FontOption, TextAlign, TextElement } from '../types'
import { ALIGN_OPTIONS, COLOR_PRESETS } from '../types'
import { FontPicker } from './FontPicker'

interface TextEditorSheetProps {
  text: TextElement | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, updates: Partial<TextElement>) => void
  onApplyAlignToAll: (align: TextAlign) => void
  onDelete: (id: string) => void
}

export function TextEditorSheet({
  text,
  isOpen,
  onOpenChange,
  onUpdate,
  onApplyAlignToAll,
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

  const handleAlignChange = (align: TextAlign) => {
    if (align === 'none') {
      onUpdate(text.id, { textAlign: align })
      return
    }
    onApplyAlignToAll(align)
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
            <Drawer.Body className="flex flex-col gap-4 overflow-y-auto px-4 pb-2">
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
                <FontPicker
                  selectedFontId={text.fontId}
                  isFontLoaded={isFontLoaded}
                  isFontLoading={(id) => loadingFonts.has(id)}
                  onSelect={handleFontSelect}
                  onLoadFont={loadFont}
                />
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
                      onPress={() => handleAlignChange(opt.id)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>粗细</Label>
                <div className="flex gap-2">
                  <Button
                    variant={text.fontWeight === 400 ? 'primary' : 'secondary'}
                    className={`flex-1 ${
                      text.fontWeight === 400 ? 'bg-black text-white' : 'border-neutral-300 bg-white text-black'
                    }`}
                    onPress={() => onUpdate(text.id, { fontWeight: 400 })}
                  >
                    常规
                  </Button>
                  <Button
                    variant={text.fontWeight === 700 ? 'primary' : 'secondary'}
                    className={`flex-1 ${
                      text.fontWeight === 700 ? 'bg-black text-white' : 'border-neutral-300 bg-white text-black'
                    }`}
                    onPress={() => onUpdate(text.id, { fontWeight: 700 })}
                  >
                    粗体
                  </Button>
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
                >
                  <Slider.Track>
                    <Slider.Fill />
                    <Slider.Thumb />
                  </Slider.Track>
                </Slider>
              </div>

              <div className="flex flex-col gap-2">
                <Label>色号</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`颜色 ${color}`}
                      className={`h-8 w-8 rounded-full border-2 transition-transform ${
                        text.color === color
                          ? 'scale-110 border-black'
                          : 'border-neutral-300'
                      } ${color === '#ffffff' ? 'shadow-inner' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => onUpdate(text.id, { color })}
                    />
                  ))}
                  <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-neutral-300">
                    <input
                      type="color"
                      value={text.color}
                      onChange={(e) => onUpdate(text.id, { color: e.target.value })}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <span className="text-xs text-neutral-500">+</span>
                  </label>
                </div>
              </div>
            </Drawer.Body>
            <Drawer.Footer className="flex gap-2 px-4 pb-4">
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
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
