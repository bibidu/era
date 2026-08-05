#!/usr/bin/env node
/**
 * 蛇大师 skill 第 1 步：拉取 era_social_video_analyses 全量图文数据并做复盘分析。
 * 见 .agents/skills/shedashi/SKILL.md
 *
 * 用法:
 *   node scripts/shedashi-analyze.mjs                 # 打印人读报告
 *   node scripts/shedashi-analyze.mjs --json          # 打印机器可读 JSON
 *   node scripts/shedashi-analyze.mjs --out report.json
 */
import { writeFileSync } from 'node:fs'
import {
  ANALYSIS_EXTRACT_STATUS,
  ANALYSIS_WORK_TYPE,
  MAX_PUBLISH_GAP_DAYS,
  WEEKDAYS,
  addDays,
  dayGap,
  isAnalyzable,
  isPublishedRecord,
  parseIssueNo,
  parseMetrics,
  planNextSlot,
  publishedDate,
  restGet,
  weekdayOf,
} from './shedashi-lib.mjs'

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name)
  if (i < 0) return fallback
  return process.argv[i + 1] ?? fallback
}

/**
 * 抖音早间推荐池明显更肥；见 SKILL.md §时段结论。
 * 凌晨单独成桶：07 点前发的作品拿不到早高峰的推荐流，混进「早」会把这个最强变量的中位数拉花。
 */
function slotOf(hour) {
  if (hour == null) return '未知'
  if (hour < 7) return '凌晨 0-6'
  if (hour < 11) return '早 7-10'
  if (hour < 15) return '午 11-14'
  return '下午 15+'
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function groupStats(posts, keyFn) {
  const groups = new Map()
  for (const post of posts) {
    const key = keyFn(post)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(post)
  }
  return [...groups.entries()].map(([key, items]) => ({
    key,
    count: items.length,
    playMedian: median(items.map((p) => p.play)),
    playMax: Math.max(...items.map((p) => p.play)),
    fansTotal: items.reduce((sum, p) => sum + p.fans, 0),
    imgsAvg: Number(
      (items.reduce((sum, p) => sum + (p.imgs || 0), 0) / items.length).toFixed(2),
    ),
    titles: items.map((p) => p.title),
  }))
}

/** 上一期篇末若预告了下一篇，本期必须接住，否则连载承诺断裂、吸粉率掉 */
function trailingPromise(records) {
  for (const record of records) {
    const text = String(record.markdown || '')
    const match = text.match(/^.*(?:下一篇|下期|下集)[^\n]*$/gm)
    if (match?.length) {
      return { fromTitle: record.title, promise: match[match.length - 1].trim() }
    }
  }
  return null
}

const records = await restGet(
  'era_social_video_analyses',
  'select=id,title,published_at,created_at,work_type,extract_status,extract_data,outline,markdown,cover_url,image_previews&order=published_at.desc',
)

const graphic = records.filter((r) => r.work_type === ANALYSIS_WORK_TYPE)

/**
 * 断更间隔是**账号级**的：风水 / 健身也占发布位，必须一起算。
 * 只统计已发布记录（手填日期格式），草稿不算。
 */
const publishedAll = records
  .filter(isPublishedRecord)
  .map((r) => ({ ...r, ...publishedDate(r.published_at) }))
  .filter((r) => r.date)
  .sort((a, b) => a.date.localeCompare(b.date))

const cadenceHistory = []
for (const [index, record] of publishedAll.entries()) {
  const prev = publishedAll[index - 1]
  const gap = prev ? dayGap(prev.date, record.date) : null
  cadenceHistory.push({
    date: record.date,
    weekday: weekdayOf(record.date),
    hour: record.hour,
    workType: record.work_type,
    title: String(record.title || '').replace(/\n/g, ' '),
    gapFromPrev: gap,
    brokeStreak: gap !== null && gap > MAX_PUBLISH_GAP_DAYS,
    play: parseMetrics(record.extract_data)?.play ?? null,
  })
}
const lastPublished = publishedAll.at(-1)?.date ?? null

/** 可进入复盘的必要条件：类型＝图文 且 数据回收状态＝提取成功（缺一不可） */
const analyzable = graphic.filter(isAnalyzable)
const skipped = {
  wrongStatus: graphic.filter((r) => !isAnalyzable(r)).length,
  statusOkButUnparsable: analyzable.filter((r) => !parseMetrics(r.extract_data)).length,
}

const withData = []
for (const record of analyzable) {
  const metrics = parseMetrics(record.extract_data)
  if (!metrics) continue
  const { date, hour } = publishedDate(record.published_at, metrics.raw['发布日期'])
  withData.push({
    id: record.id,
    title: String(record.title || '').replace(/\n/g, ' '),
    date,
    hour,
    weekday: date ? WEEKDAYS[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7] : '未知',
    slot: slotOf(hour),
    pages: (record.image_previews || []).length,
    ...metrics,
  })
}
withData.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

const issues = graphic
  .map((r) => parseIssueNo(r))
  .filter((n) => Number.isFinite(n))
const lastIssue = issues.length ? Math.max(...issues) : 0

const ranked = [...withData].sort((a, b) => b.play - a.play)
const audience = {}
for (const key of ['观众年龄_最多', '观众特征总结_兴趣职业', '观众区域_最多', '观众性别男性占比']) {
  const tally = {}
  for (const post of withData.slice(-8)) {
    const value = post.raw[key]
    if (!value || value === '未知') continue
    tally[value] = (tally[value] || 0) + 1
  }
  audience[key] = Object.entries(tally).sort((a, b) => b[1] - a[1])
}

const nextSlot = planNextSlot(lastPublished)

const report = {
  generatedAt: new Date().toISOString(),
  analysisCriteria: {
    workType: ANALYSIS_WORK_TYPE,
    extractStatus: ANALYSIS_EXTRACT_STATUS,
    note: '两个条件必须同时满足，才算可回收分析的数据',
  },
  totals: {
    records: records.length,
    graphic: graphic.length,
    analyzable: analyzable.length,
    withBackendData: withData.length,
    drafts: graphic.filter((r) => !isPublishedRecord(r)).length,
    skipped,
  },
  issue: { last: lastIssue, next: lastIssue + 1 },
  cadence: {
    maxGapDays: MAX_PUBLISH_GAP_DAYS,
    lastPublished,
    nextDeadline: lastPublished ? addDays(lastPublished, MAX_PUBLISH_GAP_DAYS) : null,
    overdue: nextSlot?.overdue ?? false,
    brokeStreakCount: cadenceHistory.filter((c) => c.brokeStreak).length,
    history: cadenceHistory,
  },
  nextSlot,
  carryOverPromise: trailingPromise(graphic),
  bySlot: groupStats(withData, (p) => p.slot).sort((a, b) => b.playMedian - a.playMedian),
  byWeekday: groupStats(withData, (p) => p.weekday).sort(
    (a, b) => WEEKDAYS.indexOf(a.key) - WEEKDAYS.indexOf(b.key),
  ),
  top3: ranked.slice(0, 3),
  bottom3: ranked.slice(-3).reverse(),
  audience,
  posts: withData,
}

const outPath = arg('--out')
if (outPath) {
  writeFileSync(outPath, JSON.stringify(report, null, 2))
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2))
} else {
  const line = (post) =>
    `${post.date} ${post.weekday} ${String(post.hour).padStart(2, '0')}点 ` +
    `播放${String(post.play).padStart(6)} 赞${String(post.like).padStart(3)} ` +
    `藏${String(post.fav).padStart(3)} 粉${String(post.fans).padStart(3)} ` +
    `划走${post.raw['划走率'] ?? '-'} 图数${post.imgs ?? '-'} 吸粉${post.raw['吸粉率'] ?? '-'}  ${post.title.slice(0, 34)}`

  console.log(`== 蛇大师复盘 ${report.generatedAt} ==`)
  console.log(
    `记录 ${report.totals.records} 条 / 图文 ${report.totals.graphic} 条 / ` +
      `可分析（图文＋提取成功）${report.totals.analyzable} 条 / 实际取到数据 ${report.totals.withBackendData} 条`,
  )
  console.log(`期数：上一期 第${report.issue.last}期 → 本期应为 第${report.issue.next}期`)
  console.log(
    `断更红线：上次发布 ${report.cadence.lastPublished ?? '无记录'}，` +
      `下一篇最晚 ${report.cadence.nextDeadline ?? '-'}（间隔 ≤ ${report.cadence.maxGapDays} 天）` +
      `${report.cadence.overdue ? '  ⚠ 已进入断更区间' : ''}`,
  )
  console.log(
    `建议档期：${report.nextSlot.date}（${report.nextSlot.weekday}）${report.nextSlot.window}` +
      `${report.nextSlot.overdue ? '  ← 已断更，今天必须发' : ''}`,
  )
  if (report.carryOverPromise) {
    console.log(`上期承诺：${report.carryOverPromise.promise}`)
  }

  console.log(`\n-- 发布节奏（账号级，含风水/健身；历史断更 ${report.cadence.brokeStreakCount} 次）--`)
  for (const c of report.cadence.history) {
    console.log(
      `${c.date} ${c.weekday} ${String(c.hour ?? '--').padStart(2, '0')}点 ` +
        `间隔${String(c.gapFromPrev ?? '-').padStart(2)}天 ${c.brokeStreak ? '✗断更' : '  ok  '} ` +
        `播放${String(c.play ?? '-').padStart(6)}  ${c.workType}  ${c.title.slice(0, 26)}`,
    )
  }

  console.log('\n-- 全部有数据作品 --')
  for (const post of withData) console.log(line(post))
  console.log('\n-- 按发布时段 --')
  for (const g of report.bySlot) {
    console.log(
      `${g.key.padEnd(8)} ${String(g.count).padStart(2)}篇 播放中位${String(g.playMedian).padStart(6)} 峰值${String(g.playMax).padStart(6)} 涨粉合计${String(g.fansTotal).padStart(3)} 平均浏览图数${g.imgsAvg}`,
    )
  }
  console.log('\n-- 按星期 --')
  for (const g of report.byWeekday) {
    console.log(
      `${g.key} ${String(g.count).padStart(2)}篇 播放中位${String(g.playMedian).padStart(6)} 涨粉合计${String(g.fansTotal).padStart(3)}`,
    )
  }
  console.log('\n-- 受众（近 8 篇众数）--')
  for (const [key, value] of Object.entries(audience)) {
    console.log(`${key}: ${value.map(([k, n]) => `${k}×${n}`).join(' / ')}`)
  }
}
