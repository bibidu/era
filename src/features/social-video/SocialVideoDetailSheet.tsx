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
          <Drawer.Dialog className="flex max-h-[82vh] min-h-[320px] flex-col overflow-hidden rounded-t-3xl bg-neutral-950 text-neutral-100">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{record?.title || '作品分析'}</p>
                <p className="truncate text-xs text-neutral-400">{record?.published_at || '未填写发布日期'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  onClick={copyMarkdown}
                >
                  一键复制
                </button>
                <button
                  type="button"
                  aria-label="关闭"
                  className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white"
                  onClick={() => onOpenChange(false)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-sm leading-6 text-neutral-100">
                {record?.markdown || '暂无分析数据'}
              </pre>
            </div>

            {status ? <p className="shrink-0 px-4 pb-4 text-sm text-neutral-300">{status}</p> : null}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
