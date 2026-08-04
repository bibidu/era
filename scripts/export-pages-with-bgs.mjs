#!/usr/bin/env node
/**
 * 风水 skill：按页切换诗意 reference 背景并导出 Era 图文页。
 * 见 .agents/skills/fengshui/SKILL.md
 *
 * 用法:
 *   node scripts/export-pages-with-bgs.mjs \
 *     --project <id> \
 *     --bg-dir <背景目录> \
 *     --plan <可选 plan.json> \
 *     --out <导出目录>
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'

const AGENT = process.env.ERA_AGENT_URL || 'http://127.0.0.1:3847'

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name)
  if (i < 0) return fallback
  return process.argv[i + 1] ?? fallback
}

async function api(method, path, body) {
  const res = await fetch(`${AGENT}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 500)}`)
  }
  return data
}

function toDataUrl(filePath) {
  const buf = readFileSync(filePath)
  const ext = filePath.toLowerCase().endsWith('.jpg') || filePath.toLowerCase().endsWith('.jpeg') ? 'jpeg' : 'png'
  return `data:image/${ext};base64,${buf.toString('base64')}`
}

const projectId = arg('--project')
const bgDir = resolve(arg('--bg-dir', 'output/caishen-fengshui/bg'))
const outDir = resolve(arg('--out', 'output/caishen-fengshui/pages'))
const planPath = arg('--plan')

if (!projectId) {
  console.error('需要 --project')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

let bgFiles = []
if (planPath && existsSync(planPath)) {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'))
  bgFiles = plan.map((p) => {
    const candidates = [
      join(bgDir, `caishen-bg-${p.slug}.jpg`),
      join(bgDir, `caishen-bg-${p.slug}.png`),
      join(bgDir, `${p.slug}.jpg`),
      join(bgDir, `${p.slug}.png`),
      join('/opt/cursor/artifacts/assets', `caishen-bg-${p.slug}.png`),
    ]
    const hit = candidates.find((c) => existsSync(c))
    if (!hit) throw new Error(`缺少背景: ${p.slug}`)
    return hit
  })
} else {
  bgFiles = readdirSync(bgDir)
    .filter((f) => /^caishen-bg-.*\.(png|jpe?g)$/i.test(f))
    .sort()
    .map((f) => join(bgDir, f))
}

const preview = await api('POST', `/v1/projects/${projectId}/preview-layout`, {})
const pageCount = preview.pageCount ?? preview.pages?.length ?? preview.page_count
console.error(`preview pages=${pageCount} backgrounds=${bgFiles.length}`)
if (!pageCount) throw new Error(`无法取得页数: ${JSON.stringify(preview).slice(0, 300)}`)
if (bgFiles.length < pageCount) {
  throw new Error(`背景不足: pages=${pageCount} bgs=${bgFiles.length}`)
}

const exported = []
for (let i = 0; i < pageCount; i++) {
  const bg = bgFiles[i]
  const dataUrl = toDataUrl(bg)
  console.error(`page ${i + 1}/${pageCount} bg=${basename(bg)} dataUrlKB=${Math.round(dataUrl.length / 1024)}`)
  await api('PATCH', `/v1/projects/${projectId}/config`, {
    patch: {
      pageOverlay: 'fengshui',
      aspectRatio: '9:16',
      showWordCount: false,
      topText: '连续观看、点赞、关注，你也是地理风水达人（阳宅篇）',
      overlayStacked: true,
      backgroundType: 'reference',
      backgroundUrl: dataUrl,
      headingFontId: 'song',
      headingFontFamily: '"Noto Serif SC", serif',
    },
  })
  const result = await api('POST', `/v1/projects/${projectId}/export`, {
    pages: [i],
    outDir,
  })
  const paths = result.paths || result.pages || result.files || []
  const first = Array.isArray(paths) ? paths[0] : null
  const src =
    (typeof first === 'string' && first) ||
    first?.path ||
    result.path ||
    join(outDir, `page-${String(i + 1).padStart(2, '0')}.png`)
  const dest = join(outDir, `page-${String(i + 1).padStart(2, '0')}.png`)
  if (existsSync(src) && resolve(src) !== resolve(dest)) {
    copyFileSync(src, dest)
  }
  exported.push(dest)
  console.error(`exported ${dest} exists=${existsSync(dest)}`)
}

writeFileSync(join(outDir, 'export-manifest.json'), JSON.stringify({ projectId, exported, bgFiles: bgFiles.slice(0, pageCount) }, null, 2))
console.log(JSON.stringify({ ok: true, pageCount, exported }, null, 2))
