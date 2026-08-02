#!/usr/bin/env node
/**
 * 搜集社媒表里的 data:image base64（cover_url / image_previews / markdown），
 * 批量上传阿里云 OSS（封面 __cover_keep__ 永久公共读），并写回 CDN URL。
 *
 * 用法:
 *   node scripts/migrate-base64-covers-to-oss.mjs [--dry-run] [--legacy] [--limit N]
 *   node scripts/migrate-base64-covers-to-oss.mjs --url <supabase> --key <anon>
 *
 * 环境变量:
 *   SUPABASE_URL / SUPABASE_ANON_KEY（或 VITE_*）
 *   --legacy 使用源码内 LEGACY_SUPABASE_*（Cloud Agent 扫库常用）
 *   OSS_* 见 scripts/oss-upload.sh
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const UPLOAD_SH = join(__dirname, 'oss-upload.sh')
const TABLE = 'era_social_video_analyses'

const DATA_URL_RE = /data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)/g

function parseArgs(argv) {
  const out = { dryRun: false, legacy: false, limit: 0, url: '', key: '' }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--legacy') out.legacy = true
    else if (a === '--limit') out.limit = Number(argv[++i] || 0)
    else if (a === '--url') out.url = String(argv[++i] || '').trim()
    else if (a === '--key') out.key = String(argv[++i] || '').trim()
    else if (a === '-h' || a === '--help') {
      console.log(`用法: node scripts/migrate-base64-covers-to-oss.mjs [--dry-run] [--legacy] [--limit N]`)
      process.exit(0)
    }
  }
  return out
}

function readLegacyFromSource() {
  const src = readFileSync(join(ROOT, 'src/agent/supabaseHighlightSetup.ts'), 'utf8')
  const url = src.match(/LEGACY_SUPABASE_URL\s*=\s*'([^']+)'/)?.[1]
  const key = src.match(/LEGACY_SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)?.[1]
  const defUrl = src.match(/DEFAULT_SUPABASE_URL\s*=\s*'([^']+)'/)?.[1]
  const defKey = src.match(/DEFAULT_SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)?.[1]
  return { url, key, defUrl, defKey }
}

function resolveConfig(args) {
  const legacy = readLegacyFromSource()
  const env = process.env
  if (args.url && args.key) return { url: args.url.replace(/\/$/, ''), anonKey: args.key }
  if (args.legacy) {
    if (!legacy.url || !legacy.key) throw new Error('无法解析 LEGACY_SUPABASE_*')
    return { url: legacy.url.replace(/\/$/, ''), anonKey: legacy.key }
  }
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || legacy.defUrl || '').replace(/\/$/, '')
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || legacy.defKey || ''
  if (!url || !anonKey) throw new Error('缺少 SUPABASE_URL / SUPABASE_ANON_KEY')
  return { url, anonKey }
}

async function supabaseFetch(config, path, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('apikey', config.anonKey)
  headers.set('Authorization', `Bearer ${config.anonKey}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (init.prefer) headers.set('Prefer', init.prefer)
  const res = await fetch(`${config.url}/rest/v1/${path}`, { ...init, headers })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 400)}`)
  if (!text) return null
  return JSON.parse(text)
}

function extFromMime(mime) {
  const m = (mime || '').toLowerCase()
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg'
  if (m.includes('webp')) return 'webp'
  if (m.includes('gif')) return 'gif'
  if (m.includes('svg')) return 'svg'
  return 'png'
}

function parseDataUrl(dataUrl) {
  const m = String(dataUrl).trim().match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/)
  if (!m) return null
  const mime = m[1]
  const b64 = m[2].replace(/\s+/g, '')
  return { mime, buffer: Buffer.from(b64, 'base64'), ext: extFromMime(mime) }
}

function collectDataUrls(record) {
  /** @type {{ field: string; index?: number; value: string }[]} */
  const hits = []
  const cover = (record.cover_url || '').trim()
  if (cover.startsWith('data:image/')) {
    hits.push({ field: 'cover_url', value: cover })
  }
  const previews = Array.isArray(record.image_previews) ? record.image_previews : []
  previews.forEach((p, index) => {
    if (typeof p === 'string' && p.trim().startsWith('data:image/')) {
      hits.push({ field: 'image_previews', index, value: p.trim() })
    }
  })
  const md = typeof record.markdown === 'string' ? record.markdown : ''
  if (md.includes('data:image/')) {
    const seen = new Set()
    for (const m of md.matchAll(DATA_URL_RE)) {
      const normalized = `data:${m[1]};base64,${m[2].replace(/\s+/g, '')}`
      if (seen.has(normalized)) continue
      seen.add(normalized)
      hits.push({ field: 'markdown', value: normalized })
    }
  }
  return hits
}

function uploadDataUrl(dataUrl, { role, recordId, index }) {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) throw new Error('无效 data URL')
  const hash = createHash('sha1').update(parsed.buffer).digest('hex').slice(0, 12)
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const baseName =
    role === 'cover'
      ? `cover-b64-${recordId.slice(0, 8)}-${hash}__cover_keep__.${parsed.ext}`
      : `preview-b64-${recordId.slice(0, 8)}-${index ?? 0}-${hash}__cover_keep__.${parsed.ext}`

  const dir = mkdtempSync(join(tmpdir(), 'era-b64-'))
  const local = join(dir, baseName)
  try {
    writeFileSync(local, parsed.buffer)
    const key = `era/assets/b64-migrate/${stamp}/${baseName}`
    const result = spawnSync('bash', [UPLOAD_SH, '--cover', local, key], {
      encoding: 'utf8',
      env: { ...process.env, OSS_SKIP_CLEANUP: '1' },
    })
    if (result.status !== 0) {
      throw new Error((result.stderr || result.stdout || 'upload failed').slice(0, 800))
    }
    const url = (result.stdout || '').trim().split('\n').filter(Boolean).at(-1)
    if (!url?.startsWith('http')) throw new Error(`上传无 URL: ${result.stdout}`)
    return url
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** 列表展示用：公共封面追加小图参数（写入库的仍是无参永久链） */
function withListThumbParams(url) {
  try {
    const u = new URL(url)
    if (!u.hostname.endsWith('.aliyuncs.com')) return url
    u.searchParams.set('x-oss-process', 'image/resize,w_400/format,webp/quality,q_75')
    return u.toString()
  } catch {
    return url
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const config = resolveConfig(args)
  console.error(`migrate-base64: url=${config.url} dryRun=${args.dryRun}`)

  let path =
    `${TABLE}?select=id,title,cover_url,image_previews,markdown,published_at,publish_status,work_type,outline&order=created_at.desc`
  if (args.limit > 0) path += `&limit=${args.limit}`

  const rows = (await supabaseFetch(config, path, { method: 'GET' })) || []
  console.error(`migrate-base64: fetched ${rows.length} rows`)

  let touched = 0
  let uploaded = 0
  let skipped = 0

  for (const row of rows) {
    const hits = collectDataUrls(row)
    if (hits.length === 0) {
      skipped += 1
      continue
    }

    console.error(`\n# ${row.id} ${row.title || ''}  hits=${hits.length}`)
    let coverUrl = row.cover_url
    let previews = Array.isArray(row.image_previews) ? [...row.image_previews] : []
    let markdown = typeof row.markdown === 'string' ? row.markdown : ''
    /** @type {Map<string, string>} */
    const cache = new Map()

    for (const hit of hits) {
      let cdn = cache.get(hit.value)
      if (!cdn) {
        if (args.dryRun) {
          cdn = `https://example.invalid/dry-run/${createHash('sha1').update(hit.value).digest('hex').slice(0, 8)}`
          console.error(`  dry-run ${hit.field}${hit.index ?? ''} bytes≈${hit.value.length}`)
        } else {
          const role = hit.field === 'cover_url' || hit.index === 0 ? 'cover' : 'preview'
          cdn = uploadDataUrl(hit.value, {
            role,
            recordId: row.id,
            index: hit.index,
          })
          uploaded += 1
          console.error(`  uploaded ${hit.field}${hit.index ?? ''} -> ${cdn}`)
          console.error(`  list-thumb example: ${withListThumbParams(cdn)}`)
        }
        cache.set(hit.value, cdn)
      }

      if (hit.field === 'cover_url') coverUrl = cdn
      else if (hit.field === 'image_previews' && typeof hit.index === 'number') {
        previews[hit.index] = cdn
      } else if (hit.field === 'markdown') {
        markdown = markdown.split(hit.value).join(cdn)
        // also replace whitespace-variants that regex matched loosely
        const loose = hit.value.replace(/^data:image\/[^;]+;base64,/, (prefix) => prefix)
        if (markdown.includes(hit.value) === false) {
          // already replaced
        }
        void loose
      }
    }

    if (args.dryRun) {
      touched += 1
      continue
    }

    await supabaseFetch(config, `${TABLE}?id=eq.${encodeURIComponent(row.id)}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({
        cover_url: coverUrl,
        image_previews: previews,
        ...(typeof row.markdown === 'string' ? { markdown } : {}),
      }),
    })
    touched += 1
    console.error(`  patched ${row.id}`)
  }

  console.error(
    `\nmigrate-base64: done touched=${touched} uploaded=${uploaded} skipped_no_b64=${skipped}`,
  )
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
