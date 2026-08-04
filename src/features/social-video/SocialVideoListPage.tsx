import { RefreshCw, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  SOCIAL_VIDEO_WORK_TYPES,
  formatSocialVideoLoadError,
  listSocialVideoAnalyses,
  sortSocialVideoAnalyses,
  type SocialVideoAnalysisRecord,
  type SocialVideoExtractStatus,
  type SocialVideoWorkType,
} from '../../agent/supabaseSocialVideoAnalysis'
import { useInViewport } from '../../hooks/useInViewport'
import { listThumbWidthForViewport, ossListThumbUrl } from '../../utils/ossListThumbUrl'

export type SocialListWorkTypeFilter = '' | SocialVideoWorkType

interface SocialVideoListPageProps {
  workTypeFilter: SocialListWorkTypeFilter
  onWorkTypeFilterChange: (value: SocialListWorkTypeFilter) => void
  reloadToken?: number
  onOpenReview: () => void
  onOpenPost: (record: SocialVideoAnalysisRecord) => void
}

const WORK_TYPE_FILTERS: { value: SocialListWorkTypeFilter; label: string }[] = [
  { value: '', label: '全部' },
  ...SOCIAL_VIDEO_WORK_TYPES.map((type) => ({ value: type, label: type })),
]

function extractStatusBadgeStyle(status: SocialVideoExtractStatus): {
  background: string
  color: string
} {
  switch (status) {
    case '提取成功':
      return { background: 'rgb(22 163 74 / 0.92)', color: '#ffffff' }
    case '提取中':
      return { background: 'rgb(59 130 246 / 0.95)', color: '#ffffff' }
    case '提取失败':
      return { background: 'rgb(220 38 38 / 0.9)', color: '#ffffff' }
    default:
      return { background: 'rgb(0 0 0 / 0.65)', color: '#ffffff' }
  }
}

function coverFallbackText(record: SocialVideoAnalysisRecord): string {
  return (record.title || '').replace(/\s+/g, ' ').trim()
}

function CoverFallbackLabel({ text }: { text: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center px-2.5"
      style={{ background: 'var(--era-panel)' }}
    >
      <p
        className="w-full truncate text-center text-xs font-medium leading-5"
        style={{ color: 'var(--era-fg)' }}
        title={text || undefined}
      >
        {text || '暂无内容'}
      </p>
    </div>
  )
}

function coverImageCandidates(record: SocialVideoAnalysisRecord): string[] {
  const urls: string[] = []
  const cover = (record.cover_url || '').trim()
  if (cover.startsWith('http://') || cover.startsWith('https://')) urls.push(cover)
  else if (cover.startsWith('data:image/')) urls.push(cover)
  const firstPreview = (record.image_previews?.[0] || '').trim()
  if (
    firstPreview &&
    firstPreview !== cover &&
    (firstPreview.startsWith('http://') ||
      firstPreview.startsWith('https://') ||
      firstPreview.startsWith('data:image/'))
  ) {
    urls.push(firstPreview)
  }
  return urls
}

function CoverThumb({
  record,
  scrollRoot,
}: {
  record: SocialVideoAnalysisRecord
  scrollRoot: Element | null
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const inView = useInViewport(hostRef, {
    root: scrollRoot,
    once: true,
    rootMargin: '0px',
    threshold: 1 / 3,
  })
  const candidates = coverImageCandidates(record)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [useThumb, setUseThumb] = useState(true)
  const [thumbWidth, setThumbWidth] = useState(() => listThumbWidthForViewport())
  const fallback = coverFallbackText(record)
  const exhausted = candidateIndex >= candidates.length
  const original = exhausted ? '' : candidates[candidateIndex] || ''
  const src =
    original && inView
      ? useThumb && !original.startsWith('data:')
        ? ossListThumbUrl(original, { width: thumbWidth })
        : original
      : ''
  const firstPreview = record.image_previews?.[0]

  useEffect(() => {
    setCandidateIndex(0)
    setUseThumb(true)
  }, [record.id, record.cover_url, firstPreview])

  useEffect(() => {
    const sync = () => setThumbWidth(listThumbWidthForViewport())
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  if (candidates.length === 0 || exhausted) {
    return <CoverFallbackLabel text={fallback} />
  }

  return (
    <div ref={hostRef} className="h-full w-full" style={{ background: 'var(--era-panel)' }}>
      {src ? (
        <img
          src={src}
          alt=""
          decoding="async"
          sizes="(max-width: 639px) 33vw, 120px"
          className="h-full w-full object-cover"
          onError={() => {
            if (useThumb && !original.startsWith('data:') && src !== original) {
              setUseThumb(false)
              return
            }
            setCandidateIndex((i) => {
              if (i + 1 < candidates.length) {
                setUseThumb(true)
                return i + 1
              }
              return candidates.length
            })
          }}
        />
      ) : null}
    </div>
  )
}

export function SocialVideoListPage({
  workTypeFilter,
  onWorkTypeFilterChange,
  reloadToken = 0,
  onOpenReview,
  onOpenPost,
}: SocialVideoListPageProps) {
  const [records, setRecords] = useState<SocialVideoAnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollRoot, setScrollRoot] = useState<Element | null>(null)

  useEffect(() => {
    setScrollRoot(scrollRef.current)
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setLoading(true)
      try {
        const rows = await listSocialVideoAnalyses({
          workType: workTypeFilter || null,
        })
        if (cancelled) return
        setRecords(sortSocialVideoAnalyses(rows))
        setError('')
      } catch (err) {
        if (cancelled) return
        setRecords([])
        setError(formatSocialVideoLoadError(err, '加载作品列表失败'))
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [workTypeFilter, reloadToken])

  async function handleRefresh() {
    if (refreshing || loading) return
    setRefreshing(true)
    try {
      const rows = await listSocialVideoAnalyses({
        workType: workTypeFilter || null,
      })
      setRecords(sortSocialVideoAnalyses(rows))
      setError('')
    } catch (err) {
      setRecords([])
      setError(formatSocialVideoLoadError(err, '刷新作品列表失败'))
    } finally {
      setRefreshing(false)
    }
  }

  const actionBtnClass =
    'inline-flex h-9 items-center gap-1 px-2.5 text-xs font-semibold transition hover:opacity-90 active:opacity-80 disabled:opacity-40'
  const actionBtnStyle = {
    color: 'var(--era-fg)',
  } as const

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}>
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: 'var(--era-border)' }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <h1 className="shrink-0 text-base font-semibold">分析列表</h1>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-full transition hover:opacity-90 disabled:opacity-40"
            style={{ color: 'var(--era-fg)' }}
            aria-label="刷新"
            title="刷新"
            disabled={refreshing || loading}
            onClick={() => void handleRefresh()}
          >
            <RefreshCw
              size={16}
              strokeWidth={2}
              className={refreshing ? 'animate-spin' : undefined}
            />
          </button>
        </div>
        <div
          className="inline-flex shrink-0 items-center overflow-hidden rounded-xl border"
          style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
          role="group"
          aria-label="快捷操作"
        >
          <button
            type="button"
            className={actionBtnClass}
            style={actionBtnStyle}
            onClick={onOpenReview}
          >
            <TrendingUp size={15} strokeWidth={2} />
            复盘
          </button>
        </div>
      </div>

      <div
        className="flex shrink-0 items-center gap-2.5 border-b px-4 py-3"
        style={{ borderColor: 'var(--era-border)', background: 'var(--era-bg)' }}
      >
        <span className="w-8 shrink-0 text-xs" style={{ color: 'var(--era-muted)' }}>
          类型
        </span>
        <select
          className="min-w-0 flex-1 rounded-2xl border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: 'var(--era-border)',
            background: 'var(--era-input)',
            color: 'var(--era-fg)',
          }}
          value={workTypeFilter}
          onChange={(event) => onWorkTypeFilterChange(event.target.value as SocialListWorkTypeFilter)}
        >
          {WORK_TYPE_FILTERS.map((item) => (
            <option key={item.label} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
            <p className="text-base font-semibold">暂无分析作品</p>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--era-muted)' }}>
              {workTypeFilter ? `当前类型「${workTypeFilter}」下没有作品。` : '暂无作品。'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {records.map((record) => {
              const badge = extractStatusBadgeStyle(record.extract_status)
              return (
                <button
                  key={record.id}
                  type="button"
                  className="group relative overflow-hidden rounded-2xl border text-left shadow-sm transition hover:opacity-95"
                  style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
                  onClick={() => onOpenPost(record)}
                >
                  <div className="aspect-[3/4] w-full">
                    <CoverThumb record={record} scrollRoot={scrollRoot} />
                    <span
                      className="absolute left-1.5 top-1.5 max-w-[calc(50%-0.5rem)] truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-none tracking-wide shadow-sm"
                      style={{ background: 'rgb(0 0 0 / 0.55)', color: '#ffffff' }}
                    >
                      {record.work_type}
                    </span>
                    <span
                      className="absolute right-1.5 top-1.5 max-w-[calc(50%-0.5rem)] truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-none tracking-wide shadow-sm"
                      style={badge}
                    >
                      {record.extract_status}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
