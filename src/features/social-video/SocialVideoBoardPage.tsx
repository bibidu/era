import { ChevronLeft, Maximize2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  listSocialVideoAnalyses,
  sortSocialVideoAnalyses,
  type SocialVideoAnalysisRecord,
} from '../../agent/supabaseSocialVideoAnalysis'
import { MetricMiniChart } from './MetricMiniChart'
import {
  extractPrimaryChartPoints,
  extractWorkSummary,
  parseMetricSections,
  truncateText,
} from './parseMarkdownMetrics'

interface SocialVideoBoardPageProps {
  onBack: () => void
}

export function SocialVideoBoardPage({ onBack }: SocialVideoBoardPageProps) {
  const [records, setRecords] = useState<SocialVideoAnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fullscreenId, setFullscreenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const rows = await listSocialVideoAnalyses({ includeMarkdown: true })
        if (cancelled) return
        setRecords(sortSocialVideoAnalyses(rows))
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '加载看板失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const fullscreenRecord = useMemo(
    () => records.find((record) => record.id === fullscreenId) ?? null,
    [fullscreenId, records],
  )

  useEffect(() => {
    if (!fullscreenRecord) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreenId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreenRecord])

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}>
      <header
        className="flex shrink-0 items-center gap-2 border-b px-3 py-3"
        style={{ borderColor: 'var(--era-border)' }}
      >
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full"
          style={{ background: 'var(--era-panel)' }}
          aria-label="返回"
          onClick={onBack}
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-base font-semibold">数据看板</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm" style={{ color: 'var(--era-muted)' }}>
            加载中...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 px-4 py-6 text-sm leading-6 text-amber-100">
            {error}
          </div>
        ) : records.length === 0 ? (
          <div
            className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed px-6 text-center"
            style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
          >
            <p className="text-base font-semibold">暂无看板数据</p>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--era-muted)' }}>
              先在分析列表保存作品后，这里会展示图表与摘要。
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {records.map((record) => {
              const markdown = record.markdown || ''
              const { title, summary } = extractWorkSummary(markdown, record.title)
              const points = extractPrimaryChartPoints(markdown)
              const preview = truncateText(summary || markdown.replace(/^#.+$/m, '').trim(), 80)
              return (
                <article
                  key={record.id}
                  className="relative rounded-3xl border p-3"
                  style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">{title}</h2>
                      <p className="mt-1 line-clamp-2 text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
                        {preview || '暂无摘要内容'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full border"
                      style={{ borderColor: 'var(--era-border)', background: 'var(--era-input)' }}
                      aria-label="全屏查看"
                      onClick={() => setFullscreenId(record.id)}
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                  <MetricMiniChart points={points} height={96} compact />
                </article>
              )
            })}
          </div>
        )}
      </div>

      {fullscreenRecord ? (
        <FullscreenBoardDetail record={fullscreenRecord} onClose={() => setFullscreenId(null)} />
      ) : null}
    </div>
  )
}

function FullscreenBoardDetail({
  record,
  onClose,
}: {
  record: SocialVideoAnalysisRecord
  onClose: () => void
}) {
  const markdown = record.markdown || ''
  const { title, summary } = extractWorkSummary(markdown, record.title)
  const sections = parseMetricSections(markdown)
  const primaryPoints = extractPrimaryChartPoints(markdown)

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}>
      <header
        className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
        style={{
          borderColor: 'var(--era-border)',
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{title}</p>
          <p className="truncate text-xs" style={{ color: 'var(--era-muted)' }}>
            {[record.work_type, record.publish_status].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          type="button"
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--era-panel)' }}
          aria-label="关闭全屏"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {summary ? (
          <p className="mb-4 text-sm leading-6" style={{ color: 'var(--era-muted)' }}>
            {summary}
          </p>
        ) : null}

        <div className="mb-4">
          <MetricMiniChart points={primaryPoints} height={160} />
        </div>

        <div className="flex flex-col gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {sections.length === 0 ? (
            <pre
              className="whitespace-pre-wrap rounded-3xl border p-4 font-mono text-sm leading-6"
              style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
            >
              {markdown || '暂无分析数据'}
            </pre>
          ) : (
            sections.map((section) => (
              <section
                key={section.id}
                className="rounded-3xl border p-4"
                style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
              >
                <h3 className="text-sm font-semibold">{section.title}</h3>
                {section.points.length > 0 ? (
                  <div className="mt-3">
                    <MetricMiniChart points={section.points} height={120} />
                  </div>
                ) : null}
                <pre
                  className="mt-3 whitespace-pre-wrap font-mono text-xs leading-5"
                  style={{ color: 'var(--era-muted)' }}
                >
                  {section.content || '暂无内容'}
                </pre>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
