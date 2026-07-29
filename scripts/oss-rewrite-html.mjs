#!/usr/bin/env node
/**
 * 将 HTML 中的本地/相对图片上传到阿里云 OSS，并替换为 OSS 公网 URL。
 * 依赖 scripts/oss-upload.sh（或环境变量已配置的 ossutil）。
 *
 * 用法:
 *   node scripts/oss-rewrite-html.mjs <index.html> [--out <path>]
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadSh = join(__dirname, 'oss-upload.sh')

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.error('用法: node scripts/oss-rewrite-html.mjs <index.html> [--out <path>]')
  process.exit(args.length === 0 ? 1 : 0)
}

const htmlPath = resolve(args[0])
let outPath = htmlPath
const outIdx = args.indexOf('--out')
if (outIdx >= 0) outPath = resolve(args[outIdx + 1])

if (!existsSync(htmlPath)) {
  console.error(`HTML 不存在: ${htmlPath}`)
  process.exit(1)
}

const dir = dirname(htmlPath)
let html = readFileSync(htmlPath, 'utf8')
const re =
  /(?:src=["']([^"']+\.(?:png|jpe?g|webp|gif|svg))["'])|(?:url\(\s*['"]?([^)'"]+\.(?:png|jpe?g|webp|gif|svg))['"]?\s*\))/gi

const refs = new Set()
for (const m of html.matchAll(re)) {
  const ref = m[1] || m[2]
  if (ref) refs.add(ref)
}

function resolveLocal(ref) {
  if (ref.startsWith('http://') || ref.startsWith('https://')) return null
  if (ref.startsWith('file://')) {
    const p = ref.replace(/^file:\/\//, '')
    return existsSync(p) ? p : null
  }
  const candidates = [
    join(dir, ref),
    ref.startsWith('/') ? ref : null,
    join(dir, 'output', basename(ref)),
    join(dir, 'assets', basename(ref)),
  ].filter(Boolean)
  return candidates.find((p) => existsSync(p)) || null
}

const COVER_KEEP_MARK = '__cover_keep__'

function looksLikeCoverName(name) {
  const base = basename(name)
  if (base.includes(COVER_KEEP_MARK)) return true
  return /^cover([._-].+)?\.(png|jpe?g|webp|gif|svg)$/i.test(base)
}

function ensureCoverKeepKey(key) {
  if (key.includes(COVER_KEEP_MARK)) return key
  const i = key.lastIndexOf('.')
  if (i <= 0 || key.lastIndexOf('/') > i) return `${key}${COVER_KEEP_MARK}`
  return `${key.slice(0, i)}${COVER_KEEP_MARK}${key.slice(i)}`
}

const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
const slug = `${basename(dir)}-${stamp}`
const map = new Map()

for (const ref of refs) {
  const local = resolveLocal(ref)
  if (!local) continue
  let key = `era/assets/${slug}/${basename(local)}`
  if (looksLikeCoverName(local) || looksLikeCoverName(key)) {
    key = ensureCoverKeepKey(key)
  }
  const result = spawnSync('bash', [uploadSh, local, key], {
    encoding: 'utf8',
    env: process.env,
  })
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    process.exit(result.status || 1)
  }
  const url = (result.stdout || '').trim().split('\n').filter(Boolean).at(-1)
  if (!url) {
    console.error(`上传无 URL: ${local}`)
    process.exit(1)
  }
  map.set(ref, url)
  map.set(basename(ref), url)
  console.error(`UPLOADED ${local} -> ${url}`)
}

for (const [from, to] of map) {
  html = html.split(from).join(to)
}

writeFileSync(outPath, html)
const htmlKey = `era/assets/${slug}/index.html`
const htmlUpload = spawnSync('bash', [uploadSh, outPath, htmlKey], {
  encoding: 'utf8',
  env: process.env,
})
if (htmlUpload.status !== 0) {
  console.error(htmlUpload.stderr || htmlUpload.stdout)
  process.exit(htmlUpload.status || 1)
}
const htmlUrl = (htmlUpload.stdout || '').trim().split('\n').filter(Boolean).at(-1)
console.log(htmlUrl)
