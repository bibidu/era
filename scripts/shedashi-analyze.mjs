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
import { restGet, WEEKDAYS, parseIssueNo, parseMetrics, publishedDate } from './shedashi-lib.mjs'

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name)
  if (i < 0) return fallback
  return process.argv[i + 1] ?? fallback
}

/** 抖音早间推荐池明显更肥；见 SKILL.md §时段结论 */
function slotOf(hour) {
  if (hour == null) return '未知'
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

/** 下一个可发的黄金档：周二/三/四；周五与周一实测最差（见 SKILL.md） */
function nextGoldenSlot(from = new Date()) {
  const GOLDEN = [2, 3, 4]
  for (let offset = 1; offset <= 8; offset += 1) {
    const day = new Date(from.getTime() + offset * 86400000)
    if (GOLDEN.includes(day.getUTCDay())) {
      const iso = day.toISOString().slice(0, 10)
      return { date: iso, weekday: WEEKDAYS[(day.getUTCDay() + 6) % 7], window: '07:40–08:00（北京时间）' }
    }
  }
  return null
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

const graphic = records.filter((r) => r.work_type === '图文')
const withData = []
for (const record of graphic) {
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

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    records: records.length,
    graphic: graphic.length,
    withBackendData: withData.length,
    drafts: graphic.filter((r) => /T\d{2}:\d{2}/.test(String(r.published_at))).length,
  },
  issue: { last: lastIssue, next: lastIssue + 1 },
  nextSlot: nextGoldenSlot(),
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
    `记录 ${report.totals.records} 条 / 图文 ${report.totals.graphic} 条 / 有后台数据 ${report.totals.withBackendData} 条`,
  )
  console.log(`期数：上一期 第${report.issue.last}期 → 本期应为 第${report.issue.next}期`)
  console.log(
    `建议档期：${report.nextSlot.date}（${report.nextSlot.weekday}）${report.nextSlot.window}`,
  )
  if (report.carryOverPromise) {
    console.log(`上期承诺：${report.carryOverPromise.promise}`)
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
