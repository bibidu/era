import { Drawer, useOverlayState } from '@heroui/react'
import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { GraphicPage } from './GraphicPage'
import { exportGraphicPages, saveGraphicPages } from './exportGraphicPages'
import { computeSaveThumbLayout } from './graphicPreviewLayout'
import { getGraphicLayout } from './layout'
import type { GraphicTextConfig, GraphicTextPage } from './types'

interface GraphicSaveImagesSheetProps {
  isOpen: boolean
  pages: GraphicTextPage[]
  config: GraphicTextConfig
  markdown: string
  onOpenChange: (open: boolean) => void
}

export function GraphicSaveImagesSheet({
  isOpen,
  pages,
  config,
  markdown,
  onOpenChange,
}: GraphicSaveImagesSheetProps) {
  const state = useOverlayState({ isOpen, onOpenChange })
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(() => new Set())
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState('')

  const thumbLayout = useMemo(() => {
    const layout = getGraphicLayout(config)
    return computeSaveThumbLayout(layout.aspectRatio)
  }, [config])

  useEffect(() => {
    if (isOpen !== state.isOpen) {
      state.setOpen(isOpen)
    }
  }, [isOpen, state])

  useEffect(() => {
    if (!state.isOpen) return
    setSelectedIndexes(new Set(pages.map((_, index) => index)))
    setSaving(false)
    setSaveProgress('')
  }, [state.isOpen, pages])

  const allSelected = pages.length > 0 && selectedIndexes.size === pages.length
  const hasSelection = selectedIndexes.size > 0

  const toggleIndex = (index: number) => {
    setSelectedIndexes((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIndexes(new Set())
      return
    }
    setSelectedIndexes(new Set(pages.map((_, index) => index)))
  }

  const handleSave = async () => {
    if (!hasSelection || saving) return

    const orderedIndexes = [...selectedIndexes].sort((a, b) => a - b)
    const selectedPages = orderedIndexes.map((index) => pages[index])

    setSaving(true)
    setSaveProgress(`正在生成 0/${selectedPages.length}`)
    try {
      const blobs = await exportGraphicPages(selectedPages, config, markdown, (current, total) => {
        setSaveProgress(`正在生成 ${current}/${total}`)
      })
      setSaveProgress('请选择“存储到照片”')
      await saveGraphicPages(blobs)
      onOpenChange(false)
    } catch {
      setSaveProgress('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="graphic-save-drawer-dialog">
            <div className="flex shrink-0 items-center justify-between px-4 py-3">
              <div className="size-9" aria-hidden />
              <p className="text-base font-semibold text-neutral-900">选择图片保存</p>
              <button
                type="button"
                aria-label="关闭"
                className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 active:bg-neutral-200"
                onClick={() => onOpenChange(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="graphic-save-gallery component-scroll-row min-h-0 flex-1 overflow-x-auto px-4 pb-4">
              <div className="flex items-start gap-3">
                {pages.map((page, index) => {
                  const selected = selectedIndexes.has(index)
                  if (!thumbLayout) return null
                  return (
                    <button
                      key={page.index}
                      type="button"
                      aria-label={`第 ${index + 1} 页`}
                      aria-pressed={selected}
                      className="graphic-save-thumb relative shrink-0"
                      onClick={() => toggleIndex(index)}
                    >
                      <div
                        className="graphic-save-thumb-frame overflow-hidden rounded-xl border border-black bg-white"
                        style={{ width: thumbLayout.width, height: thumbLayout.height }}
                      >
                        <div
                          className="graphic-save-thumb-scale origin-top-left"
                          style={{
                            width: thumbLayout.sourceWidth,
                            height: thumbLayout.sourceHeight,
                            transform: `scale(${thumbLayout.scale})`,
                          }}
                        >
                          <GraphicPage
                            page={page}
                            config={config}
                            markdown={markdown}
                            displayWidth={thumbLayout.sourceWidth}
                            className="pointer-events-none rounded-xl"
                          />
                        </div>
                      </div>
                      <span
                        className={`absolute right-2 top-2 flex size-6 items-center justify-center rounded-full border-2 ${
                          selected
                            ? 'border-white bg-neutral-900 text-white'
                            : 'border-white bg-neutral-900/25'
                        }`}
                        aria-hidden
                      >
                        {selected ? <Check size={14} strokeWidth={2.5} /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-neutral-200 px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium text-neutral-900"
                onClick={toggleAll}
              >
                <span
                  className={`flex size-5 items-center justify-center rounded-full border-2 ${
                    allSelected ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white'
                  }`}
                  aria-hidden
                >
                  {allSelected ? <Check size={12} strokeWidth={2.5} /> : null}
                </span>
                全部
              </button>

              <button
                type="button"
                disabled={!hasSelection || saving}
                className="h-11 min-w-[7.5rem] rounded-full bg-neutral-900 px-8 text-sm font-semibold text-white disabled:bg-neutral-300 disabled:text-neutral-500"
                onClick={handleSave}
              >
                {saving ? saveProgress || '生成中...' : '保存'}
              </button>
            </div>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
