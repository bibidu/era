import { Plus, Sparkles, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  SOCIAL_VIDEO_PUBLISH_STATUSES,
  listSocialVideoAnalyses,
  sortSocialVideoAnalyses,
  type SocialVideoAnalysisRecord,
  type SocialVideoPublishStatus,
} from '../../agent/supabaseSocialVideoAnalysis'
import { TEXT_FONT_OPTIONS } from '../../data/fonts'
import { ensureFontReady } from '../../utils/fontLoad'
import { SocialVideoDetailSheet } from './SocialVideoDetailSheet'

interface SocialVideoListPageProps {
  statusFilter: '' | SocialVideoPublishStatus
  onStatusFilterChange: (value: '' | SocialVideoPublishStatus) => void
  reloadToken?: number
  onSmartExtract: () => void
  onOpenReview: () => void
  onCreate: () => void
  onEdit: (record: SocialVideoAnalysisRecord) => void
}

type StatusFilter = '' | SocialVideoPublishStatus

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: '', label: '全部' },
  ...SOCIAL_VIDEO_PUBLISH_STATUSES.map((status) => ({ value: status, label: status })),
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

function CoverThumb({ record }: { record: SocialVideoAnalysisRecord }) {
  const [broken, setBroken] = useState(false)
  const fallback = coverFallbackText(record)
  const showImg = Boolean(record.cover_url) && !broken

  useEffect(() => {
    setBroken(false)
  }, [record.cover_url, record.id])

  if (!showImg) {
    return <CoverFallbackLabel text={fallback} />
  }

  return (
    <img
      src={record.cover_url!}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
      onError={() => setBroken(true)}
    />
  )
}

export function SocialVideoListPage({
  statusFilter,
  onStatusFilterChange,
  reloadToken = 0,
  onSmartExtract,
  onOpenReview,
  onCreate,
  onEdit,
}: SocialVideoListPageProps) {
  const [records, setRecords] = useState<SocialVideoAnalysisRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<SocialVideoAnalysisRecord | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(true)
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
        })
        if (cancelled) return
        setRecords(sortSocialVideoAnalyses(rows))
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '加载作品列表失败')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [statusFilter, reloadToken])

  const actionBtnClass =
    'flex size-9 items-center justify-center transition hover:opacity-90 active:opacity-80'
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
        </div>
      </div>

      <div
        className="flex shrink-0 gap-2 overflow-x-auto border-b px-4 py-2.5"
        style={{ borderColor: 'var(--era-border)' }}
      >
        {STATUS_FILTERS.map((item) => {
          const active = statusFilter === item.value
          return (
            <button
              key={item.label}
              type="button"
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition"
              style={
                active
                  ? { background: 'var(--era-button)', color: 'var(--era-button-fg)' }
                  : {
                      background: 'var(--era-panel)',
                      color: 'var(--era-muted)',
                      border: '1px solid var(--era-border)',
                    }
              }
              onClick={() => onStatusFilterChange(item.value)}
            >
              {item.label}
            </button>
          )
        })}
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
              {statusFilter
                ? `当前筛选「${statusFilter}」下没有作品。`
                : '点击右上角智能提取图标，完成后保存，作品会出现在这里。'}
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
                      setSelectedRecord(record)
                      setSheetOpen(true)
                      return
                    }
                    onEdit(record)
                  }}
                >
                  <div className="aspect-[3/4] w-full">
                    <CoverThumb record={record} />
                    <span
                      className="absolute right-1.5 top-1.5 max-w-[calc(100%-0.75rem)] truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-none tracking-wide shadow-sm"
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

      <SocialVideoDetailSheet
        record={selectedRecord}
        isOpen={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
