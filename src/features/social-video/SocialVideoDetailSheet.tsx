import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  getSocialVideoAnalysis,
  type SocialVideoAnalysisRecord,
} from '../../agent/supabaseSocialVideoAnalysis'
import { BottomSheet } from '../../components/BottomSheet'
import { MarkdownPreview } from './MarkdownPreview'

interface SocialVideoDetailSheetProps {
  record: SocialVideoAnalysisRecord | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function SocialVideoDetailSheet({ record, isOpen, onOpenChange }: SocialVideoDetailSheetProps) {
  const [status, setStatus] = useState('')
  const [detail, setDetail] = useState<SocialVideoAnalysisRecord | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setStatus('')
      setDetail(null)
      setLoadingDetail(false)
      return
    }

    if (!record?.id) return

    if (record.markdown) {
      setDetail(record)
      return
    }

    let cancelled = false
    setLoadingDetail(true)
    void (async () => {
      try {
        const full = await getSocialVideoAnalysis(record.id)
        if (!cancelled) {
          setDetail(full)
          setStatus('')
        }
      } catch (err) {
        if (!cancelled) {
          setDetail(record)
          setStatus(err instanceof Error ? err.message : '加载详情失败')
        }
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isOpen, record])

  const view = detail ?? record

  async function copyMarkdown() {
    if (!view?.markdown) {
      setStatus('暂无可复制内容。')
      return
    }

    try {
      await navigator.clipboard.writeText(view.markdown)
      setStatus('已复制分析数据。')
    } catch {
      setStatus('复制失败，请手动复制。')
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <div
        className="flex max-h-[52vh] flex-col overflow-hidden"
        style={{ background: 'var(--era-sheet)', color: 'var(--era-fg)' }}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b px-4 py-3"
          style={{ borderColor: 'var(--era-border)' }}
        >
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{view?.title || '作品分析'}</p>
            <p className="truncate text-xs" style={{ color: 'var(--era-muted)' }}>
              {[view?.work_type, view?.publish_status, view?.published_at || '未填写发布日期']
                .filter(Boolean)
                .join(' · ')}
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
          {loadingDetail ? (
            <p className="text-sm" style={{ color: 'var(--era-muted)' }}>
              加载中...
            </p>
          ) : (
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: 'var(--era-border)', background: 'var(--era-input)' }}
            >
              <MarkdownPreview value={view?.markdown || ''} />
            </div>
          )}
        </div>

        {status ? (
          <p className="shrink-0 px-4 pb-4 text-sm" style={{ color: 'var(--era-muted)' }}>
            {status}
          </p>
        ) : null}
      </div>
    </BottomSheet>
  )
}
