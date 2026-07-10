import { Button, Drawer, Input, Label, Slider, useOverlayState } from '@heroui/react'
import { useEffect } from 'react'
import { useFontLoader } from '../hooks/useFontLoader'
import type { FontOption, TextAlign, TextElement } from '../types'
import { ALIGN_OPTIONS } from '../types'
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

  const handleAlignChange = (align: TextAlign) => {
    onUpdate(text.id, { textAlign: align })
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
                <FontSelect
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
                  className="grey-slider"
                >
                  <Slider.Track className="!bg-neutral-200">
                    <Slider.Fill className="!bg-neutral-400" />
                    <Slider.Thumb className="!border-neutral-500 !bg-neutral-600" />
                  </Slider.Track>
                </Slider>
              </div>

              <div className="flex flex-col gap-2">
                <Label>颜色</Label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-300 px-3 py-2.5">
                  <span
                    className="h-8 w-8 shrink-0 rounded-md border border-neutral-200"
                    style={{ backgroundColor: text.color }}
                  />
                  <span className="text-sm text-neutral-700">自定义颜色</span>
                  <input
                    type="color"
                    value={text.color}
                    onChange={(e) => onUpdate(text.id, { color: e.target.value })}
                    className="ml-auto h-8 w-8 cursor-pointer border-0 bg-transparent p-0"
                  />
                </label>
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
