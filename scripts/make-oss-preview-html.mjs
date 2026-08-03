#!/usr/bin/env node
/**
 * 非社媒图片预览：生成简易 HTML（嵌入图链）并上传到 OSS，stdout 只打印 HTML 公共 URL。
 * 对话里禁止直发各张图片的 OSS 链接；应发本脚本返回的 HTML URL，并询问用户用完是否删除。
 *
 * 用法:
 *   node scripts/make-oss-preview-html.mjs --title "标题" \
 *     --image /path/a.png \
 *     --image /path/b.png:"可选说明" \
 *     --url "https://…/c.png:说明"
 *
 *   # 删除某次预览（HTML + 同批上传的图；不含已有外链图）
 *   node scripts/make-oss-preview-html.mjs --delete-manifest /tmp/preview.manifest.json
 *
 * stdout: HTML 公共 URL
 * stderr: 清单路径、对象 key 等
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadSh = join(__dirname, 'oss-upload.sh')
const bucket = process.env.OSS_BUCKET || 'agent-17718139319'
const endpoint = process.env.OSS_ENDPOINT || 'oss-cn-beijing.aliyuncs.com'
const prefix = process.env.OSS_PREFIX || 'era/assets'
const ossutil = process.env.OSSUTIL || join(process.env.HOME || '', '.local/bin/ossutil')

function usage(code = 1) {
  console.error(`用法:
  node scripts/make-oss-preview-html.mjs --title <标题> (--image <path[:说明]> | --url <https…[:说明]>)+
  node scripts/make-oss-preview-html.mjs --delete-manifest <manifest.json>`)
  process.exit(code)
}

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('-h') || args.includes('--help')) usage(args.length === 0 ? 1 : 0)

function takeFlag(name) {
  const i = args.indexOf(name)
  if (i < 0) return null
  const v = args[i + 1]
  if (!v || v.startsWith('--')) usage(1)
  args.splice(i, 2)
  return v
}

function takeAllFlags(name) {
  const out = []
  let v
  while ((v = takeFlag(name))) out.push(v)
  return out
}

function parseSpec(spec) {
  // path:caption or url:caption — caption after last ":" only when looks like caption (not protocol)
  if (/^https?:\/\//i.test(spec)) {
    const m = spec.match(/^(https?:\/\/.+?\.(?:png|jpe?g|webp|gif|svg))(?::(.+))?$/i)
    if (!m) return { kind: 'url', src: spec, caption: '' }
    return { kind: 'url', src: m[1], caption: (m[2] || '').trim() }
  }
  const idx = spec.lastIndexOf(':')
  if (idx > 1 && !spec.slice(idx + 1).includes('/') && !spec.slice(idx + 1).includes('\\')) {
    return { kind: 'file', src: resolve(spec.slice(0, idx)), caption: spec.slice(idx + 1).trim() }
  }
  return { kind: 'file', src: resolve(spec), caption: '' }
}

function uploadPublic(localPath, remoteKey) {
  const env = { ...process.env, OSS_SKIP_CLEANUP: process.env.OSS_SKIP_CLEANUP || '1' }
  const result = spawnSync('bash', [uploadSh, '--public', localPath, remoteKey], {
    encoding: 'utf8',
    env,
  })
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    process.exit(result.status || 1)
  }
  const url = (result.stdout || '').trim().split('\n').filter(Boolean).at(-1)
  if (!url) {
    console.error(`上传无 URL: ${localPath}`)
    process.exit(1)
  }
  return url
}

function deleteKeys(keys) {
  const util = existsSync(ossutil) ? ossutil : 'ossutil'
  let ok = 0
  let failed = 0
  for (const key of keys) {
    const r = spawnSync(util, ['rm', `oss://${bucket}/${key}`, '-f'], { encoding: 'utf8' })
    if (r.status === 0) {
      console.error(`DELETED ${key}`)
      ok += 1
    } else {
      console.error(`FAIL delete ${key}: ${(r.stderr || r.stdout || '').trim()}`)
      failed += 1
    }
  }
  console.log(JSON.stringify({ ok, failed, keys }))
}

const deleteManifest = takeFlag('--delete-manifest')
if (deleteManifest) {
  const man = JSON.parse(readFileSync(resolve(deleteManifest), 'utf8'))
  const keys = Array.isArray(man.keys) ? man.keys : []
  if (!keys.length) {
    console.error('manifest 无 keys')
    process.exit(1)
  }
  deleteKeys(keys)
  process.exit(0)
}

const title = takeFlag('--title') || '图片预览'
const imageSpecs = [...takeAllFlags('--image'), ...takeAllFlags('--url')]
if (!imageSpecs.length) usage(1)

const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
const slug = `preview-${stamp}`
const remotePrefix = `${prefix}/${slug}`
const items = []
const keys = []

for (const [i, raw] of imageSpecs.entries()) {
  const spec = parseSpec(raw)
  if (spec.kind === 'url') {
    items.push({ url: spec.src, caption: spec.caption || `图 ${i + 1}` })
    continue
  }
  if (!existsSync(spec.src)) {
    console.error(`文件不存在: ${spec.src}`)
    process.exit(1)
  }
  const base = basename(spec.src)
  const key = `${remotePrefix}/${base}`
  const url = uploadPublic(spec.src, key)
  keys.push(key)
  items.push({ url, caption: spec.caption || base, key })
}

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const figures = items
  .map(
    (it, idx) => `<figure>
  <figcaption>${escapeHtml(it.caption || `图 ${idx + 1}`)}</figcaption>
  <img src="${escapeHtml(it.url)}" alt="${escapeHtml(it.caption || `图 ${idx + 1}`)}" loading="lazy" />
</figure>`,
  )
  .join('\n')

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; --bg: #f4f1ea; --ink: #1c1917; --muted: #78716c; }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 24px 16px 64px;
      font-family: "Source Han Serif SC", "Noto Serif SC", "Songti SC", serif;
      background: radial-gradient(1200px 600px at 20% 0%, #fffaf0 0%, var(--bg) 55%, #ebe6dc 100%);
      color: var(--ink);
    }
    main { max-width: 720px; margin: 0 auto; }
    h1 { font-weight: 600; font-size: 1.35rem; letter-spacing: 0.04em; margin: 0 0 8px; }
    .meta { color: var(--muted); font-size: 0.85rem; margin-bottom: 28px; }
    figure { margin: 0 0 28px; }
    figcaption { font-size: 0.92rem; margin-bottom: 10px; color: #44403c; }
    img {
      display: block; width: 100%; height: auto;
      border-radius: 2px;
      box-shadow: 0 1px 0 rgba(28,25,23,0.06);
      background: #fff;
    }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">共 ${items.length} 张 · 临时预览页</p>
    ${figures}
  </main>
</body>
</html>
`

const workDir = join(tmpdir(), slug)
mkdirSync(workDir, { recursive: true })
const htmlPath = join(workDir, 'index.html')
writeFileSync(htmlPath, html)
const htmlKey = `${remotePrefix}/index.html`
const htmlUrl = uploadPublic(htmlPath, htmlKey)
keys.unshift(htmlKey)

const manifest = {
  title,
  createdAt: new Date().toISOString(),
  htmlUrl,
  htmlKey,
  bucket,
  endpoint,
  keys,
  imageUrls: items.map((it) => it.url),
}
const manifestPath = join(workDir, 'preview.manifest.json')
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
const artifactDir = '/opt/cursor/artifacts'
try {
  mkdirSync(artifactDir, { recursive: true })
  writeFileSync(join(artifactDir, `${slug}.manifest.json`), JSON.stringify(manifest, null, 2))
} catch {
  /* ignore */
}

console.error(`MANIFEST ${manifestPath}`)
console.error(`KEYS ${keys.join(' ')}`)
console.error(`DELETE node scripts/make-oss-preview-html.mjs --delete-manifest ${manifestPath}`)
console.log(htmlUrl)
