import { Plus, RefreshCw, Sparkles, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  SOCIAL_VIDEO_PUBLISH_STATUSES,
  SOCIAL_VIDEO_WORK_TYPES,
  formatSocialVideoLoadError,
  listSocialVideoAnalyses,
  sortSocialVideoAnalyses,
  type SocialVideoAnalysisRecord,
  type SocialVideoPublishStatus,
  type SocialVideoWorkType,
} from '../../agent/supabaseSocialVideoAnalysis'
import { TEXT_FONT_OPTIONS } from '../../data/fonts'
import { ensureFontReady } from '../../utils/fontLoad'

export type SocialListStatusFilter = '' | SocialVideoPublishStatus
export type SocialListWorkTypeFilter = '' | SocialVideoWorkType

interface SocialVideoListPageProps {
  statusFilter: SocialListStatusFilter
  onStatusFilterChange: (value: SocialListStatusFilter) => void
  workTypeFilter: SocialListWorkTypeFilter
  onWorkTypeFilterChange: (value: SocialListWorkTypeFilter) => void
  reloadToken?: number
  onSmartExtract: () => void
  onOpenReview: () => void
  onCreate: () => void
  onEdit: (record: SocialVideoAnalysisRecord) => void
  /** 已发布作品：进入查看数据二级页 */
  onOpenDetail: (record: SocialVideoAnalysisRecord) => void
}

const STATUS_FILTERS: { value: SocialListStatusFilter; label: string }[] = [
  { value: '', label: '全部' },
  ...SOCIAL_VIDEO_PUBLISH_STATUSES.map((status) => ({ value: status, label: status })),
]

const WORK_TYPE_FILTERS: { value: SocialListWorkTypeFilter; label: string }[] = [
  { value: '', label: '全部' },
  ...SOCIAL_VIDEO_WORK_TYPES.map((type) => ({ value: type, label: type })),
]

const SHUHEITI_FONT =
  TEXT_FONT_OPTIONS.find((font) => font.id === 'shuheiti') ?? TEXT_FONT_OPTIONS[0]

const SHUHEITI_FAMILY = '"Alimama ShuHeiTi", sans-serif'

function statusBadgeStyle(status: SocialVideoPublishStatus): { background: string; color: string } {
  switch (status) {
    case '已发布':
      return { background: 'rgb(22 163 74 / 0.92)', color: '#ffffff' }
    case '待AI修改':
      return { background: 'rgb(59 130 246 / 0.95)', color: '#ffffff' }
    default:
      return { background: 'rgb(0 0 0 / 0.65)', color: '#ffffff' }
  }
}

/** 封面缺失/裂图时：优先标题，否则大纲；单行由 CSS truncate */
function coverFallbackText(record: SocialVideoAnalysisRecord): string {
  const title = (record.title || '').replace(/\s+/g, ' ').trim()
  if (title) return title

  const outline = (record.outline || '').replace(/\s+/g, ' ').trim()
  if (outline) return outline

  return ''
}

function CoverFallbackLabel({ text }: { text: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center px-2.5"
      style={{ background: 'var(--era-panel)' }}
    >
      <p
        className="w-full truncate text-center text-xs font-medium leading-5"
        style={{
          fontFamily: SHUHEITI_FAMILY,
          color: 'var(--era-fg)',
        }}
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
  if (cover) urls.push(cover)
  const firstPreview = (record.image_previews?.[0] || '').trim()
  if (firstPreview && firstPreview !== cover) urls.push(firstPreview)
  return urls
}

/** 有封面/首图且能加载时直接展示图片；全部失败再退回标题/大纲文案 */
function CoverThumb({ record }: { record: SocialVideoAnalysisRecord }) {
  const candidates = coverImageCandidates(record)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const fallback = coverFallbackText(record)
  const src = candidates[candidateIndex] || ''
  const showImg = Boolean(src)

  useEffect(() => {
    setCandidateIndex(0)
  }, [record.id, record.cover_url, record.image_previews?.[0]])

  if (!showImg) {
    return <CoverFallbackLabel text={fallback} />
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
      onError={() => {
        setCandidateIndex((i) => {
          if (i + 1 < candidates.length) return i + 1
          return candidates.length
        })
      }}
    />
  )
}

function SegmentedFilter<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-8 shrink-0 text-xs leading-none" style={{ color: 'var(--era-muted)' }}>
        {label}
      </span>
      <div
        className="flex min-w-0 flex-1 overflow-x-auto rounded-full p-0.5"
        style={{ background: 'var(--era-input)', border: '1px solid var(--era-border)' }}
        role="tablist"
        aria-label={label}
      >
        {options.map((item) => {
          const active = value === item.value
          return (
            <button
              key={item.label}
              type="button"
              role="tab"
              aria-selected={active}
              className="min-w-0 flex-1 shrink-0 truncate rounded-full px-2.5 py-1.5 text-xs font-medium transition"
              style={
                active
                  ? { background: 'var(--era-button)', color: 'var(--era-button-fg)' }
                  : { background: 'transparent', color: 'var(--era-muted)' }
              }
              onClick={() => onChange(item.value)}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function emptyFilterHint(statusFilter: SocialListStatusFilter, workTypeFilter: SocialListWorkTypeFilter) {
  const parts: string[] = []
  if (workTypeFilter) parts.push(`类型「${workTypeFilter}」`)
  if (statusFilter) parts.push(`状态「${statusFilter}」`)
  if (parts.length === 0) {
    return '点击右上角智能提取图标，完成后保存，作品会出现在这里。'
  }
  return `当前筛选（${parts.join(' · ')}）下没有作品。`
}

export function SocialVideoListPage({
  statusFilter,
  onStatusFilterChange,
  workTypeFilter,
  onWorkTypeFilterChange,
  reloadToken = 0,
  onSmartExtract,
  onOpenReview,
  onCreate,
  onEdit,
  onOpenDetail,
}: SocialVideoListPageProps) {
  const [records, setRecords] = useState<SocialVideoAnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void ensureFontReady(SHUHEITI_FONT, '大纲内容预览')
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setLoading(true)
      try {
        const rows = await listSocialVideoAnalyses({
          publishStatus: statusFilter || null,
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
  }, [statusFilter, workTypeFilter, reloadToken])

  async function handleRefresh() {
    if (refreshing || loading) return
    setRefreshing(true)
    try {
      const rows = await listSocialVideoAnalyses({
        publishStatus: statusFilter || null,
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
    'flex size-9 items-center justify-center transition hover:opacity-90 active:opacity-80 disabled:opacity-40'
  const actionBtnStyle = {
    color: 'var(--era-fg)',
  } as const

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}>
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: 'var(--era-border)' }}
      >
        <h1 className="shrink-0 text-base font-semibold">分析列表</h1>
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
            aria-label="创建"
            title="创建"
            onClick={onCreate}
          >
            <Plus size={18} strokeWidth={2} />
          </button>
          <span className="h-5 w-px shrink-0" style={{ background: 'var(--era-border)' }} aria-hidden />
          <button
            type="button"
            className={actionBtnClass}
            style={actionBtnStyle}
            aria-label="复盘"
            title="复盘"
            onClick={onOpenReview}
          >
            <TrendingUp size={18} strokeWidth={2} />
          </button>
          <span className="h-5 w-px shrink-0" style={{ background: 'var(--era-border)' }} aria-hidden />
          <button
            type="button"
            className={actionBtnClass}
            style={actionBtnStyle}
            aria-label="智能提取"
            title="智能提取"
            onClick={onSmartExtract}
          >
            <Sparkles size={18} strokeWidth={2} />
          </button>
          <span className="h-5 w-px shrink-0" style={{ background: 'var(--era-border)' }} aria-hidden />
          <button
            type="button"
            className={actionBtnClass}
            style={actionBtnStyle}
            aria-label="刷新"
            title="刷新"
            disabled={refreshing || loading}
            onClick={() => void handleRefresh()}
          >
            <RefreshCw
              size={18}
              strokeWidth={2}
              className={refreshing ? 'animate-spin' : undefined}
            />
          </button>
        </div>
      </div>

      <div
        className="flex shrink-0 flex-col gap-2 border-b px-4 py-3"
        style={{ borderColor: 'var(--era-border)', background: 'var(--era-bg)' }}
      >
        <SegmentedFilter
          label="类型"
          options={WORK_TYPE_FILTERS}
          value={workTypeFilter}
          onChange={onWorkTypeFilterChange}
        />
        <SegmentedFilter
          label="状态"
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={onStatusFilterChange}
        />
      </div>

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
            <p className="text-base font-semibold">暂无分析作品</p>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--era-muted)' }}>
              {emptyFilterHint(statusFilter, workTypeFilter)}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {records.map((record) => {
              const badge = statusBadgeStyle(record.publish_status)
              return (
                <button
                  key={record.id}
                  type="button"
                  className="group relative overflow-hidden rounded-2xl border text-left shadow-sm transition hover:opacity-95"
                  style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
                  onClick={() => {
                    if (record.publish_status === '已发布') {
                      onOpenDetail(record)
                      return
                    }
                    onEdit(record)
                  }}
                >
                  <div className="aspect-[3/4] w-full">
                    <CoverThumb record={record} />
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
                      {record.publish_status}
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
