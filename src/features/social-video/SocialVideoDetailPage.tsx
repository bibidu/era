import { ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  deleteSocialVideoAnalysis,
  getSocialVideoAnalysis,
  type SocialVideoAnalysisRecord,
} from '../../agent/supabaseSocialVideoAnalysis'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { MarkdownPreview } from './MarkdownPreview'

interface SocialVideoDetailPageProps {
  record: SocialVideoAnalysisRecord
  onBack: () => void
  onDeleted?: () => void
}

/** 已发布作品：二级页查看分析数据 */
export function SocialVideoDetailPage({ record, onBack, onDeleted }: SocialVideoDetailPageProps) {
  const [status, setStatus] = useState('')
  const [detail, setDetail] = useState<SocialVideoAnalysisRecord | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingDetail(true)
    if (typeof record.markdown === 'string' && record.markdown.length > 0) {
      setDetail(record)
    }

    void (async () => {
      try {
        const full = await getSocialVideoAnalysis(record.id)
        if (cancelled) return
        setDetail(full)
        setStatus('')
      } catch (err) {
        if (cancelled) return
        if (!(typeof record.markdown === 'string' && record.markdown.length > 0)) {
          setDetail(record)
        }
        setStatus(err instanceof Error ? err.message : '加载详情失败')
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [record])

  const view = detail ?? record
  const markdown = view?.markdown || ''

  async function copyMarkdown() {
    if (!markdown) {
      setStatus('暂无可复制内容。')
      return
    }

    try {
      await navigator.clipboard.writeText(markdown)
      setStatus('已复制分析数据。')
    } catch {
      setStatus('复制失败，请手动复制。')
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    setStatus('正在删除...')
    try {
      await deleteSocialVideoAnalysis(record.id)
      setConfirmOpen(false)
      onDeleted?.()
      onBack()
    } catch (err) {
      setStatus(err instanceof Error ? `删除失败：${err.message}` : '删除失败')
      setDeleting(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}>
      <header
        className="flex shrink-0 items-center gap-2 border-b px-3 py-3"
        style={{ borderColor: 'var(--era-border)' }}
      >
        <button
          type="button"
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--era-panel)' }}
          aria-label="返回"
          onClick={onBack}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">查看数据</h1>
          <p className="truncate text-xs" style={{ color: 'var(--era-muted)' }}>
            {[view?.work_type, view?.publish_status, view?.published_at || '未填写发布日期']
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
          style={{ borderColor: 'var(--era-border)' }}
          onClick={() => void copyMarkdown()}
        >
          一键复制
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {view?.title ? (
          <h2 className="mb-3 text-lg font-semibold leading-7">{view.title}</h2>
        ) : null}
        {loadingDetail && !markdown ? (
          <p className="text-sm" style={{ color: 'var(--era-muted)' }}>
            加载中...
          </p>
        ) : (
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--era-border)', background: 'var(--era-input)' }}
          >
            <MarkdownPreview value={markdown} />
          </div>
        )}
        {status ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--era-muted)' }}>
            {status}
          </p>
        ) : null}
      </div>

      <div
        className="shrink-0 border-t px-4 py-3"
        style={{
          borderColor: 'var(--era-border)',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          background: 'var(--era-bg)',
        }}
      >
        <button
          type="button"
          className="h-12 w-full rounded-2xl text-sm font-bold transition hover:opacity-90 disabled:opacity-40"
          style={{
            background: 'rgb(220 38 38 / 0.14)',
            color: 'rgb(252 165 165)',
            border: '1px solid rgb(239 68 68 / 0.35)',
          }}
          disabled={deleting || loadingDetail}
          onClick={() => setConfirmOpen(true)}
        >
          删除
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="确认删除这条帖子？"
        description="删除后无法恢复，分析数据将从库中移除。"
        confirmLabel="确认删除"
        cancelLabel="取消"
        destructive
        confirming={deleting}
        onCancel={() => {
          if (!deleting) setConfirmOpen(false)
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
