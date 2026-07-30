#!/usr/bin/env node
/**
 * 按标题排版配置（Title Composer JSON）渲染 PNG。
 * 用法：
 *   node scripts/generate-title-composer.mjs --input title.json --out output/title.png
 *   node scripts/generate-title-composer.mjs --stdin < title.json
 */

import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const out = { input: null, out: path.join(ROOT, 'output', 'title-composer.png'), stdin: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--input' || a === '-i') out.input = argv[++i]
    else if (a === '--out' || a === '-o') out.out = path.resolve(argv[++i])
    else if (a === '--stdin') out.stdin = true
  }
  return out
}

function shuheitiFontFaceCss() {
  const woff2 = path.join(ROOT, 'public', 'fonts', 'AlimamaShuHeiTi-Bold.woff2')
  const ttf = path.join(ROOT, 'public', 'fonts', 'AlimamaShuHeiTi-Bold.ttf')
  return `@font-face {
  font-family: 'Alimama ShuHeiTi';
  src:
    url('file://${woff2}') format('woff2'),
    url('file://${ttf}') format('truetype');
  font-weight: 400 700;
  font-style: normal;
  font-display: block;
}`
}

function fontFamilyForId(fontId) {
  // 用单引号，避免打断 HTML style="..." 属性
  if (fontId === 'shuheiti') return `'Alimama ShuHeiTi', 'Noto Sans SC', sans-serif`
  if (fontId === 'song') return `'Noto Serif SC', serif`
  if (fontId === 'heiti') return `'Noto Sans SC', sans-serif`
  if (fontId === 'kai') return `'LXGW WenKai GB', serif`
  return `'Alimama ShuHeiTi', 'Noto Sans SC', sans-serif`
}

function buildHtml(config) {
  const exportWidth = config.canvas?.exportWidth ?? 1080
  const displayWidth = config.canvas?.displayWidth ?? 360
  const safeX = config.canvas?.safeX ?? 96
  const scale = exportWidth / displayWidth

  const linesHtml = (config.lines ?? [])
    .map((line, index) => {
      const colorMap = new Map((line.charColors ?? []).map((c) => [c.index, c.color]))
      const chars = Array.from(line.text)
        .map((ch, i) => {
          const color = colorMap.get(i) ?? line.color
          return `<span style="color:${color}">${escapeHtml(ch)}</span>`
        })
        .join('')
      const fontSize = Math.round(line.fontSize * scale)
      const gapAfter = Math.round((line.gapAfter ?? 0) * scale)
      const stretch = line.stretch ?? 1
      const marginBottom = index < (config.lines?.length ?? 0) - 1 ? gapAfter : 0
      const style = [
        `font-family:${fontFamilyForId(line.fontId)}`,
        `font-size:${fontSize}px`,
        'font-weight:700',
        'line-height:1.05',
        `transform:scaleX(${stretch})`,
        'transform-origin:left center',
        `margin-bottom:${marginBottom}px`,
        'white-space:nowrap',
        `letter-spacing:${stretch > 1.2 ? '-0.02em' : '0'}`,
      ].join(';')
      return `<div class="line" style="${style}">${chars}</div>`
    })
    .join('\n')

  // 高度随内容；上下各留一截空白便于查看
  const padY = Math.round(120 * scale / 3)
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
${shuheitiFontFaceCss()}
html, body {
  margin: 0;
  padding: 0;
  background: #fbf7ed;
}
#canvas {
  position: relative;
  width: ${exportWidth}px;
  box-sizing: border-box;
  padding: ${padY}px ${safeX}px;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 23px,
      rgba(0,0,0,0.035) 23px,
      rgba(0,0,0,0.035) 24px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 23px,
      rgba(0,0,0,0.035) 23px,
      rgba(0,0,0,0.035) 24px
    ),
    #fbf7ed;
  overflow: hidden;
}
.stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.guide {
  pointer-events: none;
  position: absolute;
  left: ${safeX}px;
  right: ${safeX}px;
  top: ${Math.round(padY * 0.45)}px;
  bottom: ${Math.round(padY * 0.45)}px;
  border: 2px dashed rgba(14, 165, 233, 0.55);
}
</style>
</head>
<body>
  <div id="canvas">
    <div class="guide"></div>
    <div class="stack">${linesHtml}</div>
  </div>
</body>
</html>`
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

async function readConfig(args) {
  if (args.stdin) {
    const chunks = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  }
  if (!args.input) throw new Error('请提供 --input title.json 或 --stdin')
  const raw = await readFile(path.resolve(args.input), 'utf8')
  // 允许粘贴「# JSON」后的整段文本：取最后一个 JSON 对象
  const trimmed = raw.trim()
  if (trimmed.startsWith('{')) return JSON.parse(trimmed)
  const start = trimmed.lastIndexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1))
  throw new Error('无法解析配置 JSON')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const config = await readConfig(args)
  const html = buildHtml(config)
  const outPath = args.out
  await mkdir(path.dirname(outPath), { recursive: true })

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({
      viewport: { width: config.canvas?.exportWidth ?? 1080, height: 800 },
      deviceScaleFactor: 1,
    })
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready
    })
    // 再等一拍，确保本地字体文件绘出
    await page.waitForTimeout(200)
    const box = await page.locator('#canvas').boundingBox()
    if (box) {
      await page.setViewportSize({
        width: Math.ceil(box.width),
        height: Math.ceil(box.height),
      })
    }
    await page.locator('#canvas').screenshot({ path: outPath, type: 'png' })
    console.log(outPath)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
