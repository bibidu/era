import { ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MarkdownPreview } from './MarkdownPreview'

interface MarkdownContentDrawerProps {
  isOpen: boolean
  value: string
  onClose: () => void
  /** 仅在用户点击「保存」时回写；关闭不保存 */
  onSave: (next: string) => void
}

/**
 * 满屏内容编辑抽屉：
 * - 预览用 MD 渲染；编辑用 textarea
 * - 必须点「保存」才写回；直接关闭丢弃草稿
 */
export function MarkdownContentDrawer({ isOpen, value, onClose, onSave }: MarkdownContentDrawerProps) {
  const [draft, setDraft] = useState(value)
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')

  useEffect(() => {
    if (!isOpen) return
    setDraft(value)
    setMode(value.trim() ? 'preview' : 'edit')
  }, [isOpen, value])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}
      role="dialog"
      aria-modal="true"
      aria-label="编辑内容"
    >
      <header
        className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-3"
        style={{
          borderColor: 'var(--era-border)',
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full"
          style={{ background: 'var(--era-panel)' }}
          aria-label="返回"
          onClick={onClose}
        >
          <ChevronLeft size={18} />
        </button>

        <div
          className="grid grid-cols-2 rounded-xl p-1"
          style={{ background: 'var(--era-tab-track)' }}
        >
          {([
            ['preview', '预览'],
            ['edit', '编辑'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="h-8 rounded-lg px-4 text-sm font-medium"
              style={
                mode === id
                  ? {
                      background: 'var(--era-tab-active)',
                      color: 'var(--era-fg)',
                      boxShadow: '0 1px 2px rgb(0 0 0 / 0.12)',
                    }
                  : { color: 'var(--era-tab-inactive)' }
              }
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="rounded-full px-3 py-1.5 text-sm font-semibold"
          style={{ background: 'var(--era-button)', color: 'var(--era-button-fg)' }}
          onClick={() => {
            onSave(draft)
            onClose()
          }}
        >
          保存
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {mode === 'edit' ? (
          <textarea
            className="h-full w-full resize-none border-0 bg-transparent px-4 py-4 font-mono text-sm leading-6 outline-none"
            style={{ color: 'var(--era-fg)' }}
            value={draft}
            placeholder={'支持 Markdown：\n# 标题\n## 二级标题\n```js\ncode\n```\n![图片](https://...)'}
            onChange={(event) => setDraft(event.target.value)}
          />
        ) : (
          <div className="h-full overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <MarkdownPreview value={draft} />
          </div>
        )}
      </div>
    </div>
  )
}
