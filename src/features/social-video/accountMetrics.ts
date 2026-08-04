import { extractMarkdownField } from './parseMarkdownFields'
import { parsePublishedAtSortKey, type SocialVideoAnalysisRecord } from '../../agent/supabaseSocialVideoAnalysis'

/** 单篇作品从 extract_data（兼容旧 markdown）解析出的结构化指标 */
export interface PostMetrics {
  id: string
  title: string
  publishedAt: string
  publishedTime: number
  /** 发布小时，解析不到为 null */
  hour: number | null
  dateLabel: string
  play: number
  like: number
  comment: number
  share: number
  favorite: number
  swipeRate: number
  imageViews: number
  expandRate: number
  fanGain: number
  fanLoss: number
  fanPlayShare: number
  recommendShare: number
  boostPlay: number
  tags: string[]
  /** (赞+评+藏+转) / 播放 */
  interactionRate: number
  commentRate: number
  favoriteRate: number
  /** 净涨粉 / 播放 × 10000 */
  fanGainPer10k: number
}

/** 抖音图文健康基准线，用于诊断对比 */
export const BENCHMARKS = {
  fanGainPer10k: 50,
  commentRate: 0.5,
  interactionRate: 3,
  swipeRate: 45,
  imageViews: 3,
} as const

export interface AccountTotals {
  postCount: number
  play: number
  like: number
  comment: number
  share: number
  favorite: number
  fanGain: number
  fanLoss: number
  netFanGain: number
  interactionRate: number
  commentRate: number
  fanGainPer10k: number
  avgSwipeRate: number
  avgImageViews: number
  avgPlay: number
  medianPlay: number
  zeroCommentPosts: number
}

export interface TimeSlotStat {
  label: string
  range: string
  count: number
  avgPlay: number
  medianPlay: number
}

export interface TagStat {
  tag: string
  count: number
  totalPlay: number
  avgPlay: number
  avgInteractionRate: number
}

export interface FunnelStep {
  label: string
  value: number
  /** 相对上一层的转化率，首层为 null */
  conversion: number | null
  hint: string
}

export type DiagnosisLevel = 'critical' | 'warn' | 'good'

export interface Diagnosis {
  id: string
  level: DiagnosisLevel
  title: string
  detail: string
  action: string
}

export interface AccountReview {
  posts: PostMetrics[]
  totals: AccountTotals
  timeSlots: TimeSlotStat[]
  tags: TagStat[]
  funnel: FunnelStep[]
  diagnostics: Diagnosis[]
  best: PostMetrics | null
  worst: PostMetrics | null
}

const TAG_FIELD_NAMES = [
  '话题',
  '作品话题/标签(以 # 开头）',
  '作品话题/标签(以 # 开头)',
  '作品话题/标签',
]

function tryParseMetricsJson(content: string): Record<string, unknown> | null {
  const trimmed = content.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    return null
  }
  return null
}

function valueToText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value
      .map((item) => valueToText(item))
      .filter(Boolean)
      .join(' ')
  }
  return ''
}

function readMetricText(content: string, ...names: string[]) {
  const json = tryParseMetricsJson(content)
  if (json) {
    for (const name of names) {
      const text = valueToText(json[name])
      if (text && text !== '未知') return text
    }
  }
  for (const name of names) {
    const text = extractMarkdownField(content, name).trim()
    if (text && text !== '未知') return text
  }
  return ''
}

function toNumber(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned || cleaned === '未知') return 0
  const match = cleaned.match(/-?\d+(?:\.\d+)?/)
  if (!match) return 0
  const value = Number(match[0])
  return Number.isFinite(value) ? value : 0
}

function field(content: string, ...names: string[]) {
  return toNumber(readMetricText(content, ...names))
}

function parseHour(publishedAt: string): number | null {
  const match = publishedAt.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hour = Number(match[1])
  return hour >= 0 && hour <= 23 ? hour : null
}

function formatDateLabel(publishedAt: string, fallbackTime: number) {
  const full = publishedAt.match(/\d{4}\s*[-/年]\s*(\d{1,2})\s*[-/月]\s*(\d{1,2})/)
  if (full) return `${Number(full[1])}/${Number(full[2])}`
  const short = publishedAt.match(/^(\d{1,2})\s*[-/月]\s*(\d{1,2})/)
  if (short) return `${Number(short[1])}/${Number(short[2])}`
  const date = new Date(fallbackTime)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function parseTags(content: string): string[] {
  const json = tryParseMetricsJson(content)
  if (json) {
    const topic = valueToText(json['话题'])
    const likedTopics = Array.isArray(json['观众喜欢的话题'])
      ? json['观众喜欢的话题'].map((item) => valueToText(item)).filter(Boolean)
      : []
    const hashTags = (topic.match(/#[^\s#]+/g) || []).map((tag) => tag.replace(/^#/, '').trim())
    const plainTopics = topic
      ? topic
          .split(/[,，、\s]+/)
          .map((part) => part.replace(/^#/, '').trim())
          .filter((part) => part && part !== '未知')
      : []
    const merged = [...hashTags, ...plainTopics, ...likedTopics]
    return [...new Set(merged.filter((tag) => tag && !/[.。…]{2,}$/.test(tag) && tag !== '…'))]
  }

  const raw = TAG_FIELD_NAMES.map((name) => extractMarkdownField(content, name)).find(Boolean) || ''
  const matches = raw.match(/#[^\s#]+/g) || []
  return matches
    .map((tag) => tag.replace(/^#/, '').trim())
    // 后台截图常把末尾标签截成 `#a...`，这类残缺标签统计出来会误导
    .filter((tag) => tag && !/[.。…]{2,}$/.test(tag) && tag !== '…')
}

/** 后台「作品名称」有时被标签堆砌占满，这种情况回落到帖子标题 */
function resolveTitle(extracted: string, fallback: string) {
  const cleaned = extracted.trim()
  if (!cleaned || cleaned.startsWith('#')) return fallback.trim() || cleaned || '未命名作品'
  return cleaned
}

function safeRate(numerator: number, denominator: number, scale = 100) {
  if (!denominator) return 0
  return (numerator / denominator) * scale
}

function resolveExtractContent(record: SocialVideoAnalysisRecord) {
  const data = (record.extract_data || '').trim()
  if (data) return data
  const md = (record.markdown || '').trim()
  // 仅兼容历史：结果曾被写进 markdown 的 JSON
  if (md.startsWith('{') || md.startsWith('[')) return md
  return ''
}

export function parsePostMetrics(record: SocialVideoAnalysisRecord): PostMetrics {
  const content = resolveExtractContent(record)
  const publishedAt = record.published_at || readMetricText(content, '发布日期') || ''
  const publishedTime = parsePublishedAtSortKey(publishedAt, record.created_at)

  const play = field(content, '播放量')
  const like = field(content, '点赞量')
  const comment = field(content, '评论量')
  const share = field(content, '分享量')
  const favorite = field(content, '收藏量')
  const fanGain = field(content, '涨粉量', '吸粉量')
  const fanLoss = field(content, '脱粉量')

  return {
    id: record.id,
    title: resolveTitle(readMetricText(content, '作品名称', '话题'), record.title),
    publishedAt,
    publishedTime,
    hour: parseHour(publishedAt),
    dateLabel: formatDateLabel(publishedAt, publishedTime),
    play,
    like,
    comment,
    share,
    favorite,
    swipeRate: field(content, '划走率'),
    imageViews: field(content, '平均浏览图片数'),
    expandRate: field(content, '文案展开率'),
    fanGain,
    fanLoss,
    fanPlayShare: field(content, '粉丝播放占比'),
    recommendShare: field(content, '流量来源_推荐页', '推荐页'),
    boostPlay: field(content, '平台扶持流量'),
    tags: parseTags(content),
    interactionRate: safeRate(like + comment + favorite + share, play),
    commentRate: safeRate(comment, play),
    favoriteRate: safeRate(favorite, play),
    fanGainPer10k: safeRate(fanGain - fanLoss, play, 10000),
  }
}

function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function buildTotals(posts: PostMetrics[]): AccountTotals {
  const sum = (pick: (post: PostMetrics) => number) => posts.reduce((total, post) => total + pick(post), 0)
  const play = sum((post) => post.play)
  const like = sum((post) => post.like)
  const comment = sum((post) => post.comment)
  const share = sum((post) => post.share)
  const favorite = sum((post) => post.favorite)
  const fanGain = sum((post) => post.fanGain)
  const fanLoss = sum((post) => post.fanLoss)

  const swipeSamples = posts.filter((post) => post.swipeRate > 0).map((post) => post.swipeRate)
  const imageSamples = posts.filter((post) => post.imageViews > 0).map((post) => post.imageViews)

  return {
    postCount: posts.length,
    play,
    like,
    comment,
    share,
    favorite,
    fanGain,
    fanLoss,
    netFanGain: fanGain - fanLoss,
    interactionRate: safeRate(like + comment + favorite + share, play),
    commentRate: safeRate(comment, play),
    fanGainPer10k: safeRate(fanGain - fanLoss, play, 10000),
    avgSwipeRate: average(swipeSamples),
    avgImageViews: average(imageSamples),
    avgPlay: average(posts.map((post) => post.play)),
    medianPlay: median(posts.map((post) => post.play)),
    zeroCommentPosts: posts.filter((post) => post.comment === 0).length,
  }
}

const TIME_SLOTS: { label: string; range: string; match: (hour: number) => boolean }[] = [
  { label: '早间', range: '05:00–10:59', match: (hour) => hour >= 5 && hour < 11 },
  { label: '午间', range: '11:00–14:59', match: (hour) => hour >= 11 && hour < 15 },
  { label: '下午', range: '15:00–18:59', match: (hour) => hour >= 15 && hour < 19 },
  { label: '晚间', range: '19:00–04:59', match: (hour) => hour >= 19 || hour < 5 },
]

function buildTimeSlots(posts: PostMetrics[]): TimeSlotStat[] {
  return TIME_SLOTS.map((slot) => {
    const matched = posts.filter((post) => post.hour !== null && slot.match(post.hour))
    const plays = matched.map((post) => post.play)
    return {
      label: slot.label,
      range: slot.range,
      count: matched.length,
      avgPlay: average(plays),
      medianPlay: median(plays),
    }
  }).filter((slot) => slot.count > 0)
}

function buildTagStats(posts: PostMetrics[]): TagStat[] {
  const buckets = new Map<string, PostMetrics[]>()
  for (const post of posts) {
    for (const tag of post.tags) {
      const bucket = buckets.get(tag)
      if (bucket) bucket.push(post)
      else buckets.set(tag, [post])
    }
  }

  return [...buckets.entries()]
    .map(([tag, tagPosts]) => ({
      tag,
      count: tagPosts.length,
      totalPlay: tagPosts.reduce((total, post) => total + post.play, 0),
      avgPlay: average(tagPosts.map((post) => post.play)),
      avgInteractionRate: average(tagPosts.map((post) => post.interactionRate)),
    }))
    .sort((left, right) => right.avgPlay - left.avgPlay)
}

function buildFunnel(totals: AccountTotals): FunnelStep[] {
  const stayed = Math.round(totals.play * (1 - totals.avgSwipeRate / 100))
  const interacted = totals.like + totals.comment + totals.favorite + totals.share
  return [
    {
      label: '播放',
      value: totals.play,
      conversion: null,
      hint: `${totals.postCount} 篇累计`,
    },
    {
      label: '看完首屏未划走',
      value: stayed,
      conversion: safeRate(stayed, totals.play),
      hint: `平均划走率 ${totals.avgSwipeRate.toFixed(1)}%`,
    },
    {
      label: '产生互动',
      value: interacted,
      conversion: safeRate(interacted, stayed),
      hint: `赞 ${totals.like} · 藏 ${totals.favorite} · 评 ${totals.comment} · 转 ${totals.share}`,
    },
    {
      label: '转化成粉丝',
      value: totals.netFanGain,
      conversion: safeRate(totals.netFanGain, interacted),
      hint: `涨 ${totals.fanGain} · 脱 ${totals.fanLoss}`,
    },
  ]
}

function buildDiagnostics(posts: PostMetrics[], totals: AccountTotals, timeSlots: TimeSlotStat[]): Diagnosis[] {
  const list: Diagnosis[] = []
  if (!posts.length) return list

  const fanLevel: DiagnosisLevel = totals.fanGainPer10k >= BENCHMARKS.fanGainPer10k ? 'good' : 'critical'
  list.push({
    id: 'fan-conversion',
    level: fanLevel,
    title: `每万播放净涨粉 ${totals.fanGainPer10k.toFixed(1)}`,
    detail: `${totals.play.toLocaleString()} 次播放只换来 ${totals.netFanGain} 个净新粉，健康基准是每万播放 ${BENCHMARKS.fanGainPer10k} 以上。流量能进池，但看完的人没有关注理由。`,
    action: '每篇固定尾页给出「我是谁 + 这是第几期 + 下期讲什么」，把单篇内容变成追更理由。',
  })

  const commentLevel: DiagnosisLevel = totals.commentRate >= BENCHMARKS.commentRate ? 'good' : 'critical'
  list.push({
    id: 'comment-rate',
    level: commentLevel,
    title: `评论率 ${totals.commentRate.toFixed(2)}%，${totals.zeroCommentPosts}/${totals.postCount} 篇零评论`,
    detail: `评论是推荐权重里最贵的互动信号，基准 ${BENCHMARKS.commentRate}%。内容全是「讲完即结束」的结论式表达，读者没有开口的位置。`,
    action: '结尾留二选一提问或故意留一个缺口（例如「第 4 个方法我放评论区」），把评论率先拉到 0.5%。',
  })

  const swipeLevel: DiagnosisLevel = totals.avgSwipeRate <= BENCHMARKS.swipeRate ? 'good' : 'warn'
  list.push({
    id: 'swipe-rate',
    level: swipeLevel,
    title: `平均划走率 ${totals.avgSwipeRate.toFixed(1)}%，平均只看 ${totals.avgImageViews.toFixed(1)} 张`,
    detail: `一半以上的人在首图就走，剩下的人平均翻不到第 ${Math.ceil(totals.avgImageViews)} 张，基准是划走率 ${BENCHMARKS.swipeRate}% 以内、浏览 ${BENCHMARKS.imageViews} 张以上。`,
    action: '首图改成「痛点 + 数字 + 悬念」，第二张立刻给结论，把「值得往后翻」的信号提前。',
  })

  const favoriteHeavy = totals.favorite > 0 && totals.favorite >= totals.like * 0.6
  if (favoriteHeavy) {
    list.push({
      id: 'save-over-like',
      level: 'good',
      title: `收藏 ${totals.favorite} 对点赞 ${totals.like}，内容价值感成立`,
      detail: '收藏量能顶到点赞量的六成以上，说明干货密度没问题，瓶颈不在选题质量而在传播结构。',
      action: '保持干货密度，把改造精力全部投到首图、结尾钩子和账号人设上。',
    })
  }

  const ranked = [...timeSlots].sort((left, right) => right.avgPlay - left.avgPlay)
  const bestSlot = ranked[0]
  const worstSlot = ranked[ranked.length - 1]
  if (bestSlot && worstSlot && bestSlot.label !== worstSlot.label && worstSlot.avgPlay > 0) {
    const multiple = bestSlot.avgPlay / worstSlot.avgPlay
    list.push({
      id: 'publish-slot',
      level: multiple >= 2 ? 'warn' : 'good',
      title: `${bestSlot.label}发布平均 ${Math.round(bestSlot.avgPlay)} 播放，是${worstSlot.label}的 ${multiple.toFixed(1)} 倍`,
      detail: `${bestSlot.label}（${bestSlot.range}）样本 ${bestSlot.count} 篇，${worstSlot.label}（${worstSlot.range}）样本 ${worstSlot.count} 篇。样本量还小，但差距大到值得先按它排期。`,
      action: `未来两周固定在${bestSlot.label}发布，攒够样本再验证这条规律是否成立。`,
    })
  }

  const gaps = computeGapDays(posts)
  if (gaps.maxGapDays >= 3) {
    list.push({
      id: 'cadence',
      level: 'warn',
      title: `更新最长断档 ${gaps.maxGapDays} 天，平均间隔 ${gaps.avgGapDays.toFixed(1)} 天`,
      detail: '断更之后的第一篇播放和划走率都明显更差，账号活跃度掉下去后要重新爬冷启动。',
      action: '固定隔日更，任何情况下不要连续断档超过 2 天。',
    })
  }

  return list
}

function computeGapDays(posts: PostMetrics[]) {
  const times = posts
    .map((post) => post.publishedTime)
    .filter((time) => Number.isFinite(time))
    .sort((left, right) => left - right)
  if (times.length < 2) return { maxGapDays: 0, avgGapDays: 0 }

  const dayMs = 24 * 60 * 60 * 1000
  const gaps: number[] = []
  for (let index = 1; index < times.length; index += 1) {
    gaps.push((times[index] - times[index - 1]) / dayMs)
  }
  return {
    maxGapDays: Math.round(Math.max(...gaps)),
    avgGapDays: average(gaps),
  }
}

/**
 * 汇总提取成功作品，产出账号级复盘。
 * 调用方应按账号类型（图文 / 风水 / 健身）先过滤 records，避免混算不同账号。
 */
export function buildAccountReview(records: SocialVideoAnalysisRecord[]): AccountReview {
  const posts = records
    .filter((record) => record.extract_status === '提取成功')
    .map(parsePostMetrics)
    .filter((post) => post.play > 0)
    .sort((left, right) => left.publishedTime - right.publishedTime)

  const totals = buildTotals(posts)
  const timeSlots = buildTimeSlots(posts)
  const tags = buildTagStats(posts)

  const byPlay = [...posts].sort((left, right) => right.play - left.play)

  return {
    posts,
    totals,
    timeSlots,
    tags,
    funnel: buildFunnel(totals),
    diagnostics: buildDiagnostics(posts, totals, timeSlots),
    best: byPlay[0] ?? null,
    worst: byPlay[byPlay.length - 1] ?? null,
  }
}
