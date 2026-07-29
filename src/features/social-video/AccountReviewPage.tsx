import { ChevronLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  listSocialVideoAnalyses,
  type SocialVideoAnalysisRecord,
} from '../../agent/supabaseSocialVideoAnalysis'
import {
  BENCHMARKS,
  buildAccountReview,
  type AccountReview,
  type DiagnosisLevel,
  type PostMetrics,
} from './accountMetrics'

interface AccountReviewPageProps {
  onBack: () => void
}

const LEVEL_STYLE: Record<DiagnosisLevel, { background: string; border: string; color: string; label: string }> = {
  critical: {
    background: 'rgb(239 68 68 / 0.12)',
    border: 'rgb(239 68 68 / 0.35)',
    color: 'rgb(252 165 165)',
    label: '致命',
  },
  warn: {
    background: 'rgb(245 158 11 / 0.12)',
    border: 'rgb(245 158 11 / 0.35)',
    color: 'rgb(253 224 71)',
    label: '待优化',
  },
  good: {
    background: 'rgb(34 197 94 / 0.12)',
    border: 'rgb(34 197 94 / 0.32)',
    color: 'rgb(134 239 172)',
    label: '优势',
  },
}

const panelStyle = { borderColor: 'var(--era-border)', background: 'var(--era-panel)' } as const

function formatCount(value: number) {
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(1)}w`
  return Math.round(value).toLocaleString()
}

export function AccountReviewPage({ onBack }: AccountReviewPageProps) {
  const [records, setRecords] = useState<SocialVideoAnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const rows = await listSocialVideoAnalyses({ includeMarkdown: true })
        if (cancelled) return
        setRecords(rows)
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '加载复盘数据失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const review = useMemo(() => buildAccountReview(records), [records])

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
        <div className="min-w-0">
          <h1 className="text-base font-semibold">账号复盘</h1>
          <p className="truncate text-xs" style={{ color: 'var(--era-muted)' }}>
            {loading ? '加载中...' : `已发布 ${review.totals.postCount} 篇 · 跨作品汇总`}
          </p>
        </div>
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
        ) : review.totals.postCount === 0 ? (
          <div
            className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed px-6 text-center"
            style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
          >
            <p className="text-base font-semibold">暂无已发布作品</p>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--era-muted)' }}>
              在「智能提取」里录入后台数据并标记为已发布，这里会自动算出账号级复盘。
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <OverviewGrid review={review} />
            <DiagnosticsSection review={review} />
            <FunnelSection review={review} />
            <TrendSection review={review} />
            <TimeSlotSection review={review} />
            <TagSection review={review} />
          </div>
        )}
      </div>
    </div>
  )
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border p-4" style={panelStyle}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle ? (
        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
          {subtitle}
        </p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'neutral' | 'bad' | 'good'
}) {
  const color = tone === 'bad' ? 'rgb(252 165 165)' : tone === 'good' ? 'rgb(134 239 172)' : 'var(--era-fg)'
  return (
    <div className="rounded-2xl px-3 py-3" style={{ background: 'var(--era-input)' }}>
      <p className="text-[11px] leading-none" style={{ color: 'var(--era-muted)' }}>
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold leading-none" style={{ color }}>
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[11px] leading-4" style={{ color: 'var(--era-muted)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function OverviewGrid({ review }: { review: AccountReview }) {
  const { totals } = review
  return (
    <SectionCard title="账号总览" subtitle="全部已发布作品累计，与抖音图文健康基准线对照">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="累计播放" value={formatCount(totals.play)} hint={`中位 ${formatCount(totals.medianPlay)}/篇`} />
        <StatCard
          label="净涨粉"
          value={`${totals.netFanGain}`}
          hint={`涨 ${totals.fanGain} · 脱 ${totals.fanLoss}`}
          tone={totals.netFanGain <= 10 ? 'bad' : 'neutral'}
        />
        <StatCard
          label="每万播放涨粉"
          value={totals.fanGainPer10k.toFixed(1)}
          hint={`基准 ${BENCHMARKS.fanGainPer10k}`}
          tone={totals.fanGainPer10k >= BENCHMARKS.fanGainPer10k ? 'good' : 'bad'}
        />
        <StatCard
          label="评论率"
          value={`${totals.commentRate.toFixed(2)}%`}
          hint={`基准 ${BENCHMARKS.commentRate}% · ${totals.zeroCommentPosts} 篇零评论`}
          tone={totals.commentRate >= BENCHMARKS.commentRate ? 'good' : 'bad'}
        />
        <StatCard
          label="综合互动率"
          value={`${totals.interactionRate.toFixed(2)}%`}
          hint={`基准 ${BENCHMARKS.interactionRate}%`}
          tone={totals.interactionRate >= BENCHMARKS.interactionRate ? 'good' : 'bad'}
        />
        <StatCard
          label="平均划走率"
          value={`${totals.avgSwipeRate.toFixed(1)}%`}
          hint={`基准 ≤${BENCHMARKS.swipeRate}% · 均看 ${totals.avgImageViews.toFixed(1)} 张`}
          tone={totals.avgSwipeRate <= BENCHMARKS.swipeRate ? 'good' : 'bad'}
        />
      </div>
    </SectionCard>
  )
}

function DiagnosticsSection({ review }: { review: AccountReview }) {
  return (
    <SectionCard title="诊断结论" subtitle="按规则自动生成，每条都对应一个可执行动作">
      <div className="flex flex-col gap-2">
        {review.diagnostics.map((item) => {
          const style = LEVEL_STYLE[item.level]
          return (
            <article
              key={item.id}
              className="rounded-2xl border px-3 py-3"
              style={{ background: style.background, borderColor: style.border }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4"
                  style={{ background: style.border, color: style.color }}
                >
                  {style.label}
                </span>
                <h3 className="text-sm font-semibold leading-5">{item.title}</h3>
              </div>
              <p className="mt-2 text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
                {item.detail}
              </p>
              <p className="mt-2 text-xs font-medium leading-5" style={{ color: style.color }}>
                下一步：{item.action}
              </p>
            </article>
          )
        })}
      </div>
    </SectionCard>
  )
}

function FunnelSection({ review }: { review: AccountReview }) {
  const max = Math.max(...review.funnel.map((step) => Math.abs(step.value)), 1)
  return (
    <SectionCard title="转化漏斗" subtitle="从播放一路掉到粉丝，看清楚断在哪一层">
      <div className="flex flex-col gap-2">
        {review.funnel.map((step) => {
          const ratio = Math.max(0.02, Math.abs(step.value) / max)
          return (
            <div key={step.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium">{step.label}</span>
                <span className="text-xs tabular-nums" style={{ color: 'var(--era-muted)' }}>
                  {formatCount(step.value)}
                  {step.conversion === null ? '' : ` · 转化 ${step.conversion.toFixed(2)}%`}
                </span>
              </div>
              <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--era-input)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${ratio * 100}%`, background: 'var(--era-button)', opacity: 0.85 }}
                />
              </div>
              <p className="mt-1 text-[11px] leading-4" style={{ color: 'var(--era-muted)' }}>
                {step.hint}
              </p>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

function TrendSection({ review }: { review: AccountReview }) {
  const max = Math.max(...review.posts.map((post) => post.play), 1)
  return (
    <SectionCard title="单篇趋势" subtitle="按发布时间排序，柱高为播放量">
      <div className="flex h-28 items-end gap-1.5">
        {review.posts.map((post) => (
          <div key={post.id} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={post.title}>
            <span className="text-[9px] leading-none tabular-nums" style={{ color: 'var(--era-muted)' }}>
              {formatCount(post.play)}
            </span>
            <div
              className="w-full rounded-t-md"
              style={{
                height: Math.max(3, Math.round((post.play / max) * 72)),
                background: 'var(--era-button)',
                opacity: post.play >= max * 0.5 ? 0.95 : 0.55,
              }}
            />
            <span className="max-w-full truncate text-[9px] leading-none" style={{ color: 'var(--era-muted)' }}>
              {post.dateLabel}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {[...review.posts].reverse().map((post) => (
          <PostRow key={post.id} post={post} />
        ))}
      </div>
    </SectionCard>
  )
}

function PostRow({ post }: { post: PostMetrics }) {
  return (
    <div className="rounded-2xl px-3 py-2" style={{ background: 'var(--era-input)' }}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-medium">{post.title}</p>
        <span className="shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--era-muted)' }}>
          {post.publishedAt || post.dateLabel}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-4 tabular-nums" style={{ color: 'var(--era-muted)' }}>
        播放 {formatCount(post.play)} · 赞 {post.like} · 评 {post.comment} · 藏 {post.favorite} · 净粉{' '}
        {post.fanGain - post.fanLoss} · 划走 {post.swipeRate.toFixed(1)}%
      </p>
    </div>
  )
}

function TimeSlotSection({ review }: { review: AccountReview }) {
  const max = Math.max(...review.timeSlots.map((slot) => slot.avgPlay), 1)
  return (
    <SectionCard title="发布时段" subtitle="同一时段的平均播放，样本少时只作为排期假设">
      <div className="flex flex-col gap-2">
        {review.timeSlots.map((slot) => (
          <div key={slot.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium">
                {slot.label}
                <span className="ml-1.5 text-[11px]" style={{ color: 'var(--era-muted)' }}>
                  {slot.range} · {slot.count} 篇
                </span>
              </span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--era-muted)' }}>
                均 {formatCount(slot.avgPlay)}
              </span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--era-input)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${(slot.avgPlay / max) * 100}%`, background: 'var(--era-button)', opacity: 0.85 }}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function TagSection({ review }: { review: AccountReview }) {
  const tags = review.tags.slice(0, 10)
  if (!tags.length) return null
  return (
    <SectionCard title="话题标签效果" subtitle="按平均播放排序，重复用过的标签更有参考价值">
      <div className="flex flex-col gap-1.5">
        {tags.map((tag) => (
          <div
            key={tag.tag}
            className="flex items-baseline justify-between gap-2 rounded-2xl px-3 py-2"
            style={{ background: 'var(--era-input)' }}
          >
            <span className="min-w-0 truncate text-xs font-medium">
              #{tag.tag}
              <span className="ml-1.5 text-[11px]" style={{ color: 'var(--era-muted)' }}>
                {tag.count} 篇
              </span>
            </span>
            <span className="shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--era-muted)' }}>
              均 {formatCount(tag.avgPlay)} · 互动 {tag.avgInteractionRate.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
