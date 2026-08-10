#!/usr/bin/env node
/**
 * 将备忘录两页奢侈品清单写入 kuifou_assets（幂等：按 name 去重）。
 * 用法：node scripts/kuifou-seed.mjs
 */
import { createHash } from 'node:crypto'
import { buildSeedAssets, SEED_ASSET_COUNT } from '../src/features/kuifou/seedData.ts'

const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6ImVyYS1zZWxmaG9zdCIsImlhdCI6MTc4NTY3OTQ2NCwiZXhwIjoyMTAxMDM5NDY0fQ.EZAtzZ4yHkA8eB49KBQClsQqVdX9W4KF7FPeHsXhzjU'

const AUTH_HASH =
  process.env.ERA_AUTH_HASH ||
  createHash('sha256').update('17718139319:521312').digest('hex')

const REST_BASES = [
  process.env.SUPABASE_URL,
  'http://39.106.179.17',
  'https://39.106.179.17.sslip.io',
].filter(Boolean)

async function rest(path, { method = 'GET', body, prefer } = {}) {
  let lastError
  for (const base of REST_BASES) {
    try {
      const headers = {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'X-Era-Auth': AUTH_HASH,
      }
      if (body) headers['Content-Type'] = 'application/json'
      if (prefer) headers.Prefer = prefer
      const res = await fetch(`${base.replace(/\/$/, '')}/rest/v1/${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
      const text = await res.text()
      if (!res.ok) throw new Error(`${method} ${path} ${res.status} @ ${base}: ${text.slice(0, 300)}`)
      return text ? JSON.parse(text) : null
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

const existing = (await rest('kuifou_assets?select=name,id')) || []
const existingNames = new Set(existing.map((r) => r.name))
const seeds = buildSeedAssets()
const missing = seeds.filter((s) => !existingNames.has(s.name))

console.log(`seed catalog: ${SEED_ASSET_COUNT}, existing: ${existing.length}, to insert: ${missing.length}`)

if (missing.length) {
  const maxOrder = existing.length
  const payload = missing.map((item, i) => ({
    ...item,
    sort_order: maxOrder + i + 1,
  }))
  const inserted = await rest('kuifou_assets', {
    method: 'POST',
    prefer: 'return=representation',
    body: payload,
  })
  console.log(`inserted ${inserted?.length ?? 0}`)
} else {
  console.log('nothing to insert')
}

const all = await rest('kuifou_assets?select=id,name,purchase_price,source_list&order=sort_order.asc')
const total = (all || []).reduce((s, r) => s + Number(r.purchase_price || 0), 0)
console.log(JSON.stringify({ count: all?.length ?? 0, totalPrice: Math.round(total * 100) / 100 }, null, 2))
