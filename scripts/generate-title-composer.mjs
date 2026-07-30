#!/usr/bin/env node
/**
 * 按标题排版配置（Title Composer JSON）渲染 PNG。
 *
 * 用法：
 *   node scripts/generate-title-composer.mjs --input title.json --out output/title.png
 *   node scripts/generate-title-composer.mjs --full --input title.json --out output/page.png
 *
 * --full：导出完整 9:16 风水图文页（底图 + 顶栏 + 配置标题 + 正文）
 */

import { chromium } from 'playwright'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const FENGSHUI_TOP_TEXT = '连续观看、点赞、关注，你也是地理风水达人（阳宅篇）'
const FENGSHUI_BG = path.join(ROOT, 'public', 'textures', 'fengshui-bg.png')
const SHUHEITI_WOFF2 = path.join(ROOT, 'public', 'fonts', 'AlimamaShuHeiTi-Bold.woff2')
const SHUHEITI_TTF = path.join(ROOT, 'public', 'fonts', 'AlimamaShuHeiTi-Bold.ttf')

function parseArgs(argv) {
  const out = {
    input: null,
    out: path.join(ROOT, 'output', 'title-composer.png'),
    stdin: false,
    full: false,
    aspect: '9:16',
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--input' || a === '-i') out.input = argv[++i]
    else if (a === '--out' || a === '-o') out.out = path.resolve(argv[++i])
    else if (a === '--stdin') out.stdin = true
    else if (a === '--full' || a === '--page') out.full = true
    else if (a === '--aspect') out.aspect = String(argv[++i] || '9:16')
  }
  return out
}

/** 内嵌 base64，避免 Playwright setContent / file:// 字体加载失败落到系统黑体 */
async function shuheitiFontFaceCss() {
  const [woff2, ttf] = await Promise.all([
    readFile(SHUHEITI_WOFF2),
    readFile(SHUHEITI_TTF),
  ])
  const woff2Data = `data:font/woff2;base64,${woff2.toString('base64')}`
  const ttfData = `data:font/ttf;base64,${ttf.toString('base64')}`
  return `@font-face {
  font-family: 'Alimama ShuHeiTi';
  src:
    url('${woff2Data}') format('woff2'),
    url('${ttfData}') format('truetype');
  font-weight: 400 700;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'Noto Serif SC';
  src: local('Noto Serif SC'), local('Songti SC'), local('SimSun');
  font-weight: 400 700;
  font-style: normal;
}`
}

function fontFamilyForId(fontId) {
  // 与 src/data/fonts.ts 一致：数黑体不掺其它 fallback，避免未加载时 silently 用系统黑
  if (fontId === 'shuheiti') return `'Alimama ShuHeiTi', sans-serif`
  if (fontId === 'song') return `'Noto Serif SC', serif`
  if (fontId === 'heiti') return `'Noto Sans SC', sans-serif`
  if (fontId === 'kai') return `'LXGW WenKai GB', serif`
  return `'Alimama ShuHeiTi', sans-serif`
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function buildTitleLinesHtml(config, scale) {
  return (config.lines ?? [])
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
      return `<div class="title-line" style="${style}">${chars}</div>`
    })
    .join('\n')
}

/** 标题条预览（非完整页） */
async function buildStripHtml(config) {
  const exportWidth = config.canvas?.exportWidth ?? 1080
  const displayWidth = config.canvas?.displayWidth ?? 360
  const safeX = config.canvas?.safeX ?? 96
  const scale = exportWidth / displayWidth
  const padY = Math.round(120)
  const linesHtml = buildTitleLinesHtml(config, scale)
  const fontCss = await shuheitiFontFaceCss()

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
${fontCss}
html, body { margin: 0; padding: 0; background: #fbf7ed; }
#canvas {
  position: relative;
  width: ${exportWidth}px;
  box-sizing: border-box;
  padding: ${padY}px ${safeX}px;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.035) 23px, rgba(0,0,0,0.035) 24px),
    repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(0,0,0,0.035) 23px, rgba(0,0,0,0.035) 24px),
    #fbf7ed;
  overflow: hidden;
}
.stack { display: flex; flex-direction: column; align-items: flex-start; }
.guide {
  pointer-events: none;
  position: absolute;
  left: ${safeX}px; right: ${safeX}px;
  top: ${Math.round(padY * 0.45)}px; bottom: ${Math.round(padY * 0.45)}px;
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

function parseAspect(aspect) {
  const [w, h] = String(aspect).split(':').map(Number)
  if (!w || !h) return { w: 9, h: 16 }
  return { w, h }
}

/**
 * 完整图文页：风水底 + 顶栏 + 配置标题 + 正文。
 * 几何必须与 src/features/graphic-text/layout.ts getGraphicLayout 一致，
 * 也与标题 Tab 预览（TitlePreview）同一套百分比。
 */
async function buildFullPageHtml(config, aspect = '9:16') {
  const exportWidth = config.canvas?.exportWidth ?? 1080
  const displayWidth = config.canvas?.displayWidth ?? 360
  const safeX = config.canvas?.safeX ?? 96
  const scale = exportWidth / displayWidth
  const { w: aw, h: ah } = parseAspect(aspect)
  const pageHeight = Math.round((exportWidth * ah) / aw)
  const refHeight = 1440
  const heightScale = pageHeight / refHeight

  // = getGraphicLayout({ aspectRatio }) 同一公式
  const topBarY = Math.round(84 * heightScale)
  const topBarHeight = Math.round(44 * heightScale)
  const contentPaddingBelowTop = Math.round(40 * heightScale)
  const safeTop = topBarY + topBarHeight + contentPaddingBelowTop
  const bottomPadding = Math.round(56 * heightScale)
  const topBarFontSize = Math.round(10 * scale)
  const bodyFontSize = Math.round(13 * scale)
  const bodyLineHeight = 1.64
  const headingFontSize = Math.round(20 * scale)

  const linesHtml = buildTitleLinesHtml(config, scale)
  const fontCss = await shuheitiFontFaceCss()
  const bgUrl = `file://${FENGSHUI_BG}`

  const bodyBlocks = [
    {
      type: 'heading',
      text: '为什么西北不能做厨房',
    },
    {
      type: 'body',
      text: '八宅风水里，西北为乾位，主天门、男主人与贵人运。厨房属火，一旦落在西北，即成「火烧天门」——是阳宅里最忌讳的格局之一。',
    },
    {
      type: 'body',
      text: '轻则口舌、失眠、事业阻滞，重则伤家长、耗财。看到家里西北角起火开灶，先别硬扛，优先调整功能分区。',
    },
  ]

  const bodyHtml = bodyBlocks
    .map((block) => {
      if (block.type === 'heading') {
        return `<h2 class="heading">${escapeHtml(block.text)}</h2>`
      }
      return `<p class="body">${escapeHtml(block.text)}</p>`
    })
    .join('\n')

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
${fontCss}
html, body { margin: 0; padding: 0; background: #F0F5F8; }
#canvas {
  position: relative;
  width: ${exportWidth}px;
  height: ${pageHeight}px;
  box-sizing: border-box;
  overflow: hidden;
  background: #F0F5F8;
  color: #171717;
}
.bg {
  position: absolute;
  inset: 0;
  background-image: url('${bgUrl}');
  background-size: cover;
  background-position: center;
  opacity: 0.68;
}
.mist-top {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(240,245,248,0.5) 0%, rgba(240,245,248,0.16) 38%, rgba(240,245,248,0) 58%);
}
.mist-mid {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 42%, rgba(170,190,205,0.08) 0%, rgba(170,190,205,0) 70%);
}
.mist-bottom {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(180,205,220,0) 55%, rgba(180,205,220,0.06) 100%);
}
.topbar {
  position: absolute;
  left: ${safeX}px;
  right: ${safeX}px;
  top: ${topBarY}px;
  height: ${topBarHeight}px;
  box-sizing: border-box;
  border-bottom: 2px solid #E5E5E5;
  display: flex;
  align-items: flex-end;
  padding-bottom: 8px;
  font-size: ${topBarFontSize}px;
  font-weight: 400;
  color: #A3A3A3;
  font-family: 'Noto Serif SC', serif;
  z-index: 2;
}
.content {
  position: absolute;
  left: ${safeX}px;
  right: ${safeX}px;
  top: ${safeTop}px;
  bottom: ${bottomPadding}px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.title-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: ${Math.round(28 * scale)}px;
}
.heading {
  margin: ${Math.round(18 * scale)}px 0 ${Math.round(8 * scale)}px;
  font-family: 'Alimama ShuHeiTi', 'Noto Sans SC', sans-serif;
  font-size: ${headingFontSize}px;
  font-weight: 700;
  line-height: 1.18;
  color: #171717;
}
.body {
  margin: 0 0 ${Math.round(12 * scale)}px;
  font-family: 'Noto Serif SC', serif;
  font-size: ${bodyFontSize}px;
  font-weight: 400;
  line-height: ${bodyLineHeight};
  color: #171717;
}
</style>
</head>
<body>
  <div id="canvas">
    <div class="bg"></div>
    <div class="mist-top"></div>
    <div class="mist-mid"></div>
    <div class="mist-bottom"></div>
    <div class="topbar">${escapeHtml(FENGSHUI_TOP_TEXT)}</div>
    <div class="content">
      <div class="title-stack">${linesHtml}</div>
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`
}

async function readConfig(args) {
  if (args.stdin) {
    const chunks = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  }
  if (!args.input) throw new Error('请提供 --input title.json 或 --stdin')
  const raw = await readFile(path.resolve(args.input), 'utf8')
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
  const exportWidth = config.canvas?.exportWidth ?? 1080
  const { w: aw, h: ah } = parseAspect(args.aspect)
  const pageHeight = Math.round((exportWidth * ah) / aw)

  const html = args.full
    ? await buildFullPageHtml(config, args.aspect)
    : await buildStripHtml(config)
  const outPath = args.out
  await mkdir(path.dirname(outPath), { recursive: true })

  const tmpHtml = path.join(path.dirname(outPath), `.title-render-${process.pid}.html`)
  await writeFile(tmpHtml, html, 'utf8')

  const sampleText = (config.lines ?? []).map((l) => l.text).join('') || '标题'
  const needShuhei = (config.lines ?? []).some(
    (l) => !l.fontId || l.fontId === 'shuheiti',
  )

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({
      viewport: {
        width: exportWidth,
        height: args.full ? pageHeight : 800,
      },
      deviceScaleFactor: 1,
    })
    // 与 generate-cover 一致：file:// 打开本地 HTML，再强制 load 数黑体
    await page.goto(`file://${tmpHtml}`, { waitUntil: 'networkidle' })
    const fontOk = await page.evaluate(async ({ needShuhei, sampleText }) => {
      if (document.fonts?.ready) await document.fonts.ready
      if (needShuhei && document.fonts?.load) {
        await document.fonts.load(`700 264px "Alimama ShuHeiTi"`, sampleText)
        await document.fonts.load(`400 120px "Alimama ShuHeiTi"`, sampleText)
      }
      return needShuhei
        ? document.fonts.check(`700 264px "Alimama ShuHeiTi"`, sampleText)
        : true
    }, { needShuhei, sampleText })
    if (!fontOk) {
      console.error('错误: 阿里妈妈数黑体未加载成功，拒绝出图（避免落到系统字体）')
      process.exit(1)
    }
    await page.waitForTimeout(200)
    if (!args.full) {
      const box = await page.locator('#canvas').boundingBox()
      if (box) {
        await page.setViewportSize({
          width: Math.ceil(box.width),
          height: Math.ceil(box.height),
        })
      }
    }
    await page.locator('#canvas').screenshot({ path: outPath, type: 'png' })
    console.log(outPath)
  } finally {
    await browser.close()
    try {
      await unlink(tmpHtml)
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
