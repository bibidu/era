import { Drawer, useOverlayState } from '@heroui/react'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { SocialVideoAnalysisRecord } from '../../agent/supabaseSocialVideoAnalysis'

interface SocialVideoDetailSheetProps {
  record: SocialVideoAnalysisRecord | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function SocialVideoDetailSheet({ record, isOpen, onOpenChange }: SocialVideoDetailSheetProps) {
  const state = useOverlayState({ isOpen, onOpenChange })
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (isOpen !== state.isOpen) {
      state.setOpen(isOpen)
    }
  }, [isOpen, state])

  useEffect(() => {
    if (!state.isOpen) {
      setStatus('')
    }
  }, [state.isOpen])

  async function copyMarkdown() {
    if (!record?.markdown) {
      setStatus('暂无可复制内容。')
      return
    }

    try {
      await navigator.clipboard.writeText(record.markdown)
      setStatus('已复制分析数据。')
    } catch {
      setStatus('复制失败，请手动复制。')
    }
  }

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog
            className="flex max-h-[52vh] flex-col overflow-hidden rounded-t-3xl"
            style={{ background: 'var(--era-sheet)', color: 'var(--era-fg)' }}
          >
            <div
              className="flex shrink-0 items-center justify-between border-b px-4 py-3"
              style={{ borderColor: 'var(--era-border)' }}
            >
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{record?.title || '作品分析'}</p>
                <p className="truncate text-xs" style={{ color: 'var(--era-muted)' }}>
                  {record?.published_at || '未填写发布日期'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
                  style={{ borderColor: 'var(--era-border)' }}
                  onClick={copyMarkdown}
                >
                  一键复制
                </button>
                <button
                  type="button"
                  aria-label="关闭"
                  className="flex size-9 items-center justify-center rounded-full"
                  style={{ background: 'var(--era-panel)' }}
                  onClick={() => onOpenChange(false)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <pre
                className="whitespace-pre-wrap rounded-2xl border p-4 font-mono text-sm leading-6"
                style={{ borderColor: 'var(--era-border)', background: 'var(--era-input)' }}
              >
                {record?.markdown || '暂无分析数据'}
              </pre>
            </div>

            {status ? (
              <p className="shrink-0 px-4 pb-4 text-sm" style={{ color: 'var(--era-muted)' }}>
                {status}
              </p>
            ) : null}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
