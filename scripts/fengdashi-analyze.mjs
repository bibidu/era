#!/usr/bin/env node
/**
 * 风大师 skill 第 1 步：拉取 era_social_video_analyses 的风水数据并做复盘。
 * 见 .agents/skills/fengdashi/SKILL.md
 *
 * 用法:
 *   node scripts/fengdashi-analyze.mjs                # 打印人读报告
 *   node scripts/fengdashi-analyze.mjs --json         # 打印机器可读 JSON
 *   node scripts/fengdashi-analyze.mjs --out report.json
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  ANALYSIS_EXTRACT_STATUS,
  FENGSHUI_WORK_TYPE,
  MAX_PUBLISH_GAP_DAYS,
  WEEKDAYS,
  addDays,
  dayGap,
  isFengAnalyzable,
  isPublishedRecord,
  parseMetrics,
  planNextSlot,
  publishedDate,
  restGet,
  seriesPartOf,
  slotOf,
  weekdayOf,
} from './fengdashi-lib.mjs'

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name)
  if (i < 0) return fallback
  return process.argv[i + 1] ?? fallback
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

/** 上一篇若在篇末预告了下一篇（分篇连载），本期必须接住。只看正文段落，跳过标题行（#）。 */
function trailingPromise(records) {
  for (const record of records) {
    const lines = String(record.markdown || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && /(?:下一篇|下篇|下期|接着讲|接下来讲)/.test(l))
    if (lines.length) {
      return { fromTitle: String(record.title || '').replace(/\n/g, ' '), promise: lines[lines.length - 1] }
    }
  }
  return null
}

/** 找出尚未收尾的分篇连载：有（上/中篇）但库里没有对应（下篇）的系列 */
function openSeries(records) {
  const base = (t) => String(t || '').replace(/（[上中下终]篇）|[((][上中下终]篇[))]/g, '').trim()
  const closed = new Set()
  const open = new Map()
  for (const r of records) {
    const part = seriesPartOf(r.title)
    if (!part) continue
    const key = base(r.title)
    if (part === '下' || part === '终') closed.add(key)
    else open.set(key, { series: key, lastPart: part, title: String(r.title).replace(/\n/g, ' ') })
  }
  return [...open.values()].filter((s) => !closed.has(s.series))
}

const records = await restGet(
  'era_social_video_analyses',
  'select=id,title,published_at,created_at,work_type,extract_status,extract_data,outline,markdown,cover_url,image_previews&order=published_at.desc',
)

const fengshui = records.filter((r) => r.work_type === FENGSHUI_WORK_TYPE)

/**
 * 断更间隔：风水号（爸爸的抖音）只发风水，故只按风水已发布记录算。
 * 抖音断更惩罚要求相邻两篇间隔 ≤ 2 天。只统计已发布记录（手填日期格式），草稿不算。
 */
const publishedAll = fengshui
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
    title: String(record.title || '').replace(/\n/g, ' '),
    gapFromPrev: gap,
    brokeStreak: gap !== null && gap > MAX_PUBLISH_GAP_DAYS,
    play: parseMetrics(record.extract_data)?.play ?? null,
  })
}
const lastPublished = publishedAll.at(-1)?.date ?? null

/** 可进入复盘：风水 + 提取成功 + extract_data 能解析 */
const analyzable = fengshui.filter(isFengAnalyzable)
const skipped = {
  wrongStatus: fengshui.filter((r) => !isFengAnalyzable(r)).length,
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
    search: metrics.raw['流量来源_搜索页'] ?? '未知',
    ...metrics,
  })
}
withData.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

const ranked = [...withData].sort((a, b) => b.play - a.play)

/** 划走率是风水号的命门：与播放量强负相关。按划走率升序列出，供判封面 */
const bySwipe = [...withData]
  .filter((p) => p.swipeAway)
  .sort((a, b) => a.swipeAway - b.swipeAway)
  .map((p) => ({ title: p.title, swipeAway: p.swipeAway, play: p.play, fans: p.fans }))

/** 搜索长尾：风水号特有红利，标题带可搜词能吃搜索流量 */
const bySearch = [...withData]
  .map((p) => ({ title: p.title, searchPct: p.search, play: p.play }))
  .sort((a, b) => (Number.parseFloat(String(b.searchPct)) || 0) - (Number.parseFloat(String(a.searchPct)) || 0))

/** 收藏 ≥ 点赞＝可抄型内容的信号 */
const favOverLike = withData
  .filter((p) => p.fav >= p.like && (p.fav || p.like))
  .map((p) => ({ title: p.title, fav: p.fav, like: p.like, play: p.play }))

const audience = {}
for (const key of ['观众年龄_最多', '观众区域_最多', '观众职业']) {
  const tally = {}
  for (const post of withData.slice(-8)) {
    let value = post.raw[key]
    if (Array.isArray(value)) value = value[0]
    if (!value || value === '未知') continue
    tally[value] = (tally[value] || 0) + 1
  }
  audience[key] = Object.entries(tally).sort((a, b) => b[1] - a[1])
}

/** 观众也关注的同类作者：找选题空白用 */
const peers = {}
for (const post of withData) {
  const list = post.raw['观众喜欢_关注的同类作者']
  if (!Array.isArray(list)) continue
  for (const name of list) peers[name] = (peers[name] || 0) + 1
}
const peerAuthors = Object.entries(peers).sort((a, b) => b[1] - a[1])

const nextSlot = planNextSlot(lastPublished)

const report = {
  generatedAt: new Date().toISOString(),
  account: '风水号 · 阳宅篇（爸爸的抖音）',
  analysisCriteria: {
    workType: FENGSHUI_WORK_TYPE,
    extractStatus: ANALYSIS_EXTRACT_STATUS,
    note: '两个条件必须同时满足，才算可回收分析的数据',
  },
  totals: {
    records: records.length,
    fengshui: fengshui.length,
    analyzable: analyzable.length,
    withBackendData: withData.length,
    drafts: fengshui.filter((r) => !isPublishedRecord(r)).length,
    skipped,
  },
  cadence: {
    maxGapDays: MAX_PUBLISH_GAP_DAYS,
    lastPublished,
    nextDeadline: lastPublished ? addDays(lastPublished, MAX_PUBLISH_GAP_DAYS) : null,
    overdue: nextSlot?.overdue ?? false,
    brokeStreakCount: cadenceHistory.filter((c) => c.brokeStreak).length,
    history: cadenceHistory,
  },
  nextSlot,
  carryOverPromise: trailingPromise(fengshui),
  openSeries: openSeries(fengshui),
  bySlot: groupStats(withData, (p) => p.slot).sort((a, b) => b.playMedian - a.playMedian),
  byWeekday: groupStats(withData, (p) => p.weekday).sort(
    (a, b) => WEEKDAYS.indexOf(a.key) - WEEKDAYS.indexOf(b.key),
  ),
  top3: ranked.slice(0, 3),
  bottom3: ranked.slice(-3).reverse(),
  bySwipe,
  bySearch,
  favOverLike,
  audience,
  peerAuthors,
  posts: withData,
}

const outPath = arg('--out')
if (outPath) {
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(report, null, 2))
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2))
} else {
  const line = (post) =>
    `${post.date ?? '草稿  '} ${post.weekday} ${String(post.hour ?? '--').padStart(2, '0')}点 ` +
    `播放${String(post.play).padStart(6)} 赞${String(post.like).padStart(3)} ` +
    `藏${String(post.fav).padStart(3)} 粉${String(post.fans).padStart(3)} ` +
    `划走${post.raw['划走率'] ?? '-'} 搜索${post.search} 图数${post.imgs ?? '-'}  ${post.title.slice(0, 30)}`

  console.log(`== 风大师复盘 ${report.generatedAt} ==`)
  console.log(`账号：${report.account}`)
  console.log(
    `记录 ${report.totals.records} 条 / 风水 ${report.totals.fengshui} 条 / ` +
      `可分析（风水＋提取成功）${report.totals.analyzable} 条 / 实际取到数据 ${report.totals.withBackendData} 条`,
  )
  console.log(
    `断更红线：上次发布 ${report.cadence.lastPublished ?? '无记录'}，` +
      `下一篇最晚 ${report.cadence.nextDeadline ?? '-'}（间隔 ≤ ${report.cadence.maxGapDays} 天）` +
      `${report.cadence.overdue ? '  ⚠ 已进入断更区间' : ''}`,
  )
  console.log(
    `建议档期：${report.nextSlot.date}（${report.nextSlot.weekday}）${report.nextSlot.window}` +
      `${report.nextSlot.overdue ? '  ← 已断更，今天必须发' : ''}`,
  )
  if (report.carryOverPromise) console.log(`上篇预告（需接住）：${report.carryOverPromise.promise}`)
  if (report.openSeries.length) {
    console.log(`未收尾连载：${report.openSeries.map((s) => `${s.title}（缺下篇）`).join(' / ')}`)
  }

  console.log(`\n-- 发布节奏（仅风水；历史断更 ${report.cadence.brokeStreakCount} 次）--`)
  for (const c of report.cadence.history) {
    console.log(
      `${c.date} ${c.weekday} ${String(c.hour ?? '--').padStart(2, '0')}点 ` +
        `间隔${String(c.gapFromPrev ?? '-').padStart(2)}天 ${c.brokeStreak ? '✗断更' : '  ok  '} ` +
        `播放${String(c.play ?? '-').padStart(6)}  ${c.title.slice(0, 24)}`,
    )
  }

  console.log('\n-- 全部有数据作品 --')
  for (const post of withData) console.log(line(post))

  console.log('\n-- 划走率 vs 播放（命门；升序）--')
  for (const s of report.bySwipe) {
    console.log(`划走${String(s.swipeAway).padStart(6)}%  播放${String(s.play).padStart(6)}  粉${String(s.fans).padStart(3)}  ${s.title.slice(0, 30)}`)
  }

  console.log('\n-- 搜索页占比（长尾红利；降序）--')
  for (const s of report.bySearch) {
    console.log(`搜索${String(s.searchPct).padStart(6)}  播放${String(s.play).padStart(6)}  ${s.title.slice(0, 30)}`)
  }

  console.log('\n-- 收藏 ≥ 点赞（可抄型）--')
  for (const s of report.favOverLike) console.log(`藏${String(s.fav).padStart(3)} ≥ 赞${String(s.like).padStart(3)}  ${s.title.slice(0, 30)}`)

  console.log('\n-- 按发布时段 --')
  for (const g of report.bySlot) {
    console.log(
      `${g.key.padEnd(8)} ${String(g.count).padStart(2)}篇 播放中位${String(g.playMedian).padStart(6)} 峰值${String(g.playMax).padStart(6)} 涨粉合计${String(g.fansTotal).padStart(3)} 平均浏览图数${g.imgsAvg}`,
    )
  }

  console.log('\n-- 受众（近 8 篇众数）--')
  for (const [key, value] of Object.entries(audience)) {
    console.log(`${key}: ${value.map(([k, n]) => `${k}×${n}`).join(' / ')}`)
  }
  console.log(`同类作者（找选题空白）：${peerAuthors.slice(0, 8).map(([k, n]) => `${k}×${n}`).join(' / ')}`)
}
