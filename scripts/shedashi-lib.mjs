#!/usr/bin/env node
/**
 * 蛇大师 skill 公共库：业务库 REST 读写 + 后台数据解析。
 * 见 .agents/skills/shedashi/SKILL.md
 */

import { computeEraAuthHash } from './era-auth-core.mjs'

const ERA_AUTH_HASH =
  process.env.ERA_AUTH_HASH || computeEraAuthHash('17718139319', '521312')

export const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** 可进入复盘分析的必要条件（两个都要满足，缺一不可） */
export const ANALYSIS_WORK_TYPE = '图文'
export const ANALYSIS_EXTRACT_STATUS = '提取成功'

/**
 * 抖音断更惩罚：上一次发布后最晚第 3 天必须再发，即相邻两篇间隔 ≤ 2 天。
 * 该约束是**账号级**的，风水 / 健身等其它类型也算在内。
 */
export const MAX_PUBLISH_GAP_DAYS = 2

/**
 * 各星期的档期优先级（数字越大越优先），来自后台数据：
 * 周三 / 周四早发实测 3379–11000；周五早发 633（间隔合规，纯周五效应）；
 * 周一早发 662 但同时踩了 3 天断更，真实水平大概率高于周五，故排在周五之上。
 * 周二尚无早发样本，按周中同档暂列高位（待验证）；周末无样本且受众放假。
 */
export const WEEKDAY_PRIORITY = {
  周四: 6,
  周三: 5,
  周二: 4,
  周一: 3,
  周五: 2,
  周六: 1,
  周日: 0,
}

/**
 * 固定周节律：周一、周二、周三、周四、周六。
 *
 * 这是同时满足两个约束的解——相邻间隔全部 ≤ 2 天（周四→周六 2、周六→周一 2，其余 1），
 * 且把三个黄金档（周二三四）全部占住，只让出实测最差的周五与无样本的周日。
 * 只靠「窗口内挑优先级最高」的贪心排法会滑成 周三→周四→周五→周六→周一，反而漏掉周二。
 */
export const PLAN_WEEKDAYS = ['周一', '周二', '周三', '周四', '周六']

/** 手填 `2026-08-03 07:55` ＝已发布；ISO 带 `T` ＝入库时自动写的草稿时间 */
export function isPublishedRecord(record) {
  const text = String(record?.published_at ?? '')
  return /^\d{4}-\d{2}-\d{2}/.test(text) && !text.includes('T')
}

/** 可进入复盘的记录：图文 + 提取成功 + extract_data 能解析 */
export function isAnalyzable(record) {
  return (
    record?.work_type === ANALYSIS_WORK_TYPE &&
    record?.extract_status === ANALYSIS_EXTRACT_STATUS
  )
}

export function toUtcDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`)
}

export function weekdayOf(dateStr) {
  return WEEKDAYS[(toUtcDate(dateStr).getUTCDay() + 6) % 7]
}

export function dayGap(fromDateStr, toDateStr) {
  return Math.round((toUtcDate(toDateStr) - toUtcDate(fromDateStr)) / 86400000)
}

export function addDays(dateStr, days) {
  return new Date(toUtcDate(dateStr).getTime() + days * 86400000).toISOString().slice(0, 10)
}

/**
 * 排下一期档期：先满足断更硬约束（上次发布 +1..+2 天），再在窗口里挑星期优先级最高的那天。
 * 若今天已经超出窗口，说明已经断更，必须立刻发。
 */
export function planNextSlot(lastPublishedDate, today = new Date().toISOString().slice(0, 10)) {
  const window = '07:40–08:00（北京时间）'
  if (!lastPublishedDate) {
    // 没有发布记录：退化成挑最近的一个黄金档
    for (let offset = 0; offset <= 7; offset += 1) {
      const date = addDays(today, offset)
      if (WEEKDAY_PRIORITY[weekdayOf(date)] >= 4) {
        return { date, weekday: weekdayOf(date), window, overdue: false, gapFromLast: null }
      }
    }
  }

  const deadline = addDays(lastPublishedDate, MAX_PUBLISH_GAP_DAYS)
  const overdue = dayGap(deadline, today) > 0

  // 已断更：今天就得发，没有挑日子的余地
  if (overdue) {
    return {
      date: today,
      weekday: weekdayOf(today),
      window,
      overdue: true,
      gapFromLast: dayGap(lastPublishedDate, today),
      deadline,
    }
  }

  // 候选＝不早于今天、且不晚于断更截止日
  const candidates = []
  for (let offset = 1; offset <= MAX_PUBLISH_GAP_DAYS; offset += 1) {
    const date = addDays(lastPublishedDate, offset)
    if (dayGap(date, today) > 0) continue
    candidates.push(date)
  }
  if (!candidates.length) candidates.push(deadline)

  // 先回到固定周节律（取窗口内最早的节律日），节律被打乱时再退回按星期优先级挑
  const onPlan = candidates.filter((date) => PLAN_WEEKDAYS.includes(weekdayOf(date)))
  const best = onPlan.length
    ? onPlan.sort((a, b) => a.localeCompare(b))[0]
    : candidates.sort(
        (a, b) =>
          WEEKDAY_PRIORITY[weekdayOf(b)] - WEEKDAY_PRIORITY[weekdayOf(a)] || a.localeCompare(b),
      )[0]

  return {
    date: best,
    weekday: weekdayOf(best),
    window,
    overdue: false,
    onPlan: PLAN_WEEKDAYS.includes(weekdayOf(best)),
    gapFromLast: dayGap(lastPublishedDate, best),
    deadline,
  }
}

export const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6ImVyYS1zZWxmaG9zdCIsImlhdCI6MTc4NTY3OTQ2NCwiZXhwIjoyMTAxMDM5NDY0fQ.EZAtzZ4yHkA8eB49KBQClsQqVdX9W4KF7FPeHsXhzjU'

/**
 * Cloud Agent 出口到 sslip.io 的 TLS 常被中断，裸 IP HTTP 可用。
 * 交付给用户的预览链仍必须是 HTTPS（Safari 保存到相册），此处仅为脚本读写。
 */
const REST_BASES = [
  process.env.SUPABASE_URL,
  'https://39.106.179.17.sslip.io',
  'http://39.106.179.17',
].filter(Boolean)

let resolvedBase = null

async function tryBase(base, path, init) {
  const headers = new Headers(init.headers)
  headers.set('apikey', ANON_KEY)
  headers.set('Authorization', `Bearer ${ANON_KEY}`)
  if (ERA_AUTH_HASH) headers.set('X-Era-Auth', ERA_AUTH_HASH)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (init.prefer) headers.set('Prefer', init.prefer)

  const res = await fetch(`${base.replace(/\/$/, '')}/rest/v1/${path}`, { ...init, headers })
  const text = await res.text()
  if (!res.ok) throw new Error(`REST ${res.status} @ ${base}: ${text.slice(0, 400)}`)
  return text ? JSON.parse(text) : null
}

async function rest(path, init = {}) {
  const bases = resolvedBase ? [resolvedBase] : REST_BASES
  let lastError
  for (const base of bases) {
    try {
      const result = await tryBase(base, path, init)
      resolvedBase = base
      return result
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('业务库 REST 全部入口不可用')
}

export const restGet = (table, query) => rest(`${table}?${query}`, { method: 'GET' })

export const restPost = (table, body) =>
  rest(table, { method: 'POST', prefer: 'return=representation', body: JSON.stringify(body) })

export const restPatch = (table, query, body) =>
  rest(`${table}?${query}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify(body),
  })

/** 「1.1万」「3379」「12.5%」→ number */
export function toNumber(value) {
  if (value == null) return 0
  const text = String(value).trim()
  if (!text || text === '未知') return 0
  const scale = text.includes('万') ? 10000 : 1
  const parsed = Number.parseFloat(text.replace(/[万%,]/g, ''))
  return Number.isFinite(parsed) ? parsed * scale : 0
}

/** extract_data 是抖音后台截图的智能提取 JSON；解析失败返回 null */
export function parseMetrics(extractData) {
  if (!extractData || typeof extractData !== 'string' || !extractData.trim()) return null
  let raw
  try {
    raw = JSON.parse(extractData)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object' || !raw['播放量']) return null
  return {
    raw,
    play: Math.round(toNumber(raw['播放量'])),
    like: Math.round(toNumber(raw['点赞量'])),
    fav: Math.round(toNumber(raw['收藏量'])),
    fans: Math.round(toNumber(raw['涨粉量'])),
    swipeAway: toNumber(raw['划走率']),
    coverClick: toNumber(raw['封面点击率']),
    imgs: toNumber(raw['平均浏览图片数']),
    fanRate: toNumber(raw['吸粉率']),
    favRate: toNumber(raw['收藏率']),
    topics: String(raw['话题'] ?? ''),
  }
}

/** published_at 有「2026-08-03 07:55」「2026-08-04T06:47:21Z」等多种写法 */
export function publishedDate(publishedAt, fallbackFromMetrics) {
  for (const candidate of [publishedAt, fallbackFromMetrics]) {
    const text = String(candidate ?? '')
    const day = text.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (!day) continue
    const time = text.match(/[T ](\d{2}):(\d{2})/)
    return { date: `${day[1]}-${day[2]}-${day[3]}`, hour: time ? Number(time[1]) : null }
  }
  return { date: null, hour: null }
}

/**
 * 期号来源（按可靠性排序）：outline 前缀 `第N期 |` → 正文 `第N期` → 封面 key `ep<N>`。
 * 入库脚本会把期号写进 outline 前缀，因此新作品一定能被读到。
 */
export function parseIssueNo(record) {
  const sources = [record.outline, record.markdown, record.cover_url]
  let best = NaN
  for (const source of sources) {
    const text = String(source ?? '')
    for (const match of text.matchAll(/第\s*(\d{1,3})\s*期/g)) {
      const value = Number(match[1])
      if (!Number.isFinite(best) || value > best) best = value
    }
    for (const match of text.matchAll(/(?:^|[^a-z0-9])ep(\d{1,3})(?![0-9])/gi)) {
      const value = Number(match[1])
      if (!Number.isFinite(best) || value > best) best = value
    }
    if (Number.isFinite(best)) return best
  }
  return best
}
