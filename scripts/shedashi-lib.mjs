#!/usr/bin/env node
/**
 * 蛇大师 skill 公共库：业务库 REST 读写 + 后台数据解析。
 * 见 .agents/skills/shedashi/SKILL.md
 */

export const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

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
