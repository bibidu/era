import { RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  /** 列表是否在前台展示（二级页返回后据此恢复滚动） */
  active?: boolean
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

function groupRecordsByWorkType(records: SocialVideoAnalysisRecord[]) {
  const sorted = sortSocialVideoAnalyses(records)
  return SOCIAL_VIDEO_WORK_TYPES.map((type) => ({
    type,
    records: sorted.filter((record) => record.work_type === type),
  })).filter((section) => section.records.length > 0)
}

function RecordCard({
  record,
  scrollRoot,
  onOpen,
}: {
  record: SocialVideoAnalysisRecord
  scrollRoot: Element | null
  onOpen: (record: SocialVideoAnalysisRecord) => void
}) {
  const badge = extractStatusBadgeStyle(record.extract_status)
  return (
    <button
      type="button"
      className="group relative overflow-hidden rounded-2xl border text-left shadow-sm transition hover:opacity-95"
      style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
      onClick={() => onOpen(record)}
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
}

export function SocialVideoListPage({
  workTypeFilter,
  onWorkTypeFilterChange,
  reloadToken = 0,
  active = true,
  onOpenPost,
}: SocialVideoListPageProps) {
  const [records, setRecords] = useState<SocialVideoAnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Partial<Record<SocialVideoWorkType, HTMLElement | null>>>({})
  const savedScrollTopRef = useRef(0)
  const recordsRef = useRef(records)
  const prevFilterRef = useRef(workTypeFilter)
  const [scrollRoot, setScrollRoot] = useState<Element | null>(null)
  const wasActiveRef = useRef(active)
  recordsRef.current = records

  useEffect(() => {
    setScrollRoot(scrollRef.current)
  }, [])

  useEffect(() => {
    let cancelled = false
    const filterChanged = prevFilterRef.current !== workTypeFilter
    prevFilterRef.current = workTypeFilter
    // 仅 reloadToken 刷新且已有数据时静默更新，避免二级页返回闪白并丢滚动
    const silent = !filterChanged && recordsRef.current.length > 0

    if (filterChanged) {
      savedScrollTopRef.current = 0
    }

    void (async () => {
      if (!silent) setLoading(true)
      try {
        const rows = await listSocialVideoAnalyses({
          workType: workTypeFilter || null,
        })
        if (cancelled) return
        setRecords(sortSocialVideoAnalyses(rows))
        setError('')
      } catch (err) {
        if (cancelled) return
        if (!silent) setRecords([])
        setError(formatSocialVideoLoadError(err, '加载作品列表失败'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [workTypeFilter, reloadToken])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return

    if (wasActiveRef.current && !active) {
      savedScrollTopRef.current = node.scrollTop
    }
    if (!wasActiveRef.current && active) {
      const top = savedScrollTopRef.current
      const restore = () => {
        if (scrollRef.current) scrollRef.current.scrollTop = top
      }
      restore()
      requestAnimationFrame(restore)
    }
    wasActiveRef.current = active
  }, [active])

  const sections = useMemo(() => {
    if (workTypeFilter) {
      return [
        {
          type: workTypeFilter,
          records: sortSocialVideoAnalyses(records),
        },
      ]
    }
    return groupRecordsByWorkType(records)
  }, [records, workTypeFilter])

  const presentTypes = useMemo(
    () => (workTypeFilter ? [] : sections.map((section) => section.type)),
    [sections, workTypeFilter],
  )
  const showTypeRail = !workTypeFilter && presentTypes.length > 1

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

  function scrollToType(type: SocialVideoWorkType) {
    const section = sectionRefs.current[type]
    const scroller = scrollRef.current
    if (!section || !scroller) return
    const sectionTop = section.getBoundingClientRect().top
    const scrollerTop = scroller.getBoundingClientRect().top
    const nextTop = scroller.scrollTop + (sectionTop - scrollerTop)
    savedScrollTopRef.current = nextTop
    scroller.scrollTo({ top: nextTop, behavior: 'smooth' })
  }

  function renderGrid(items: SocialVideoAnalysisRecord[]) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {items.map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            scrollRoot={scrollRoot}
            onOpen={onOpenPost}
          />
        ))}
      </div>
    )
  }

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

      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4"
        onScroll={(event) => {
          if (active) {
            savedScrollTopRef.current = event.currentTarget.scrollTop
          }
        }}
      >
        {loading && records.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm" style={{ color: 'var(--era-muted)' }}>
            加载中...
          </div>
        ) : error && records.length === 0 ? (
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
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {workTypeFilter ? (
                renderGrid(sections[0]?.records ?? [])
              ) : (
                <div className="flex flex-col">
                  {sections.map((section, index) => (
                    <section
                      key={section.type}
                      ref={(node) => {
                        sectionRefs.current[section.type] = node
                      }}
                      id={`list-type-${section.type}`}
                      className={index > 0 ? 'mt-5 border-t pt-5' : undefined}
                      style={index > 0 ? { borderColor: 'var(--era-border)' } : undefined}
                    >
                      {renderGrid(section.records)}
                    </section>
                  ))}
                </div>
              )}
            </div>

            {showTypeRail ? (
              <nav
                className="sticky top-0 z-10 flex w-9 shrink-0 flex-col items-stretch gap-1.5 self-start"
                aria-label="按类型跳转"
              >
                {presentTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="flex min-h-10 items-center justify-center rounded-lg border px-1 py-2 text-center text-[11px] font-semibold leading-tight tracking-wide transition hover:opacity-90"
                    style={{
                      borderColor: 'var(--era-border)',
                      background: 'var(--era-panel)',
                      color: 'var(--era-fg)',
                      writingMode: 'vertical-rl',
                      textOrientation: 'upright',
                    }}
                    onClick={() => scrollToType(type)}
                  >
                    {type}
                  </button>
                ))}
              </nav>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
