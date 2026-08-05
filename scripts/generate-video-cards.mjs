#!/usr/bin/env node
// 出视频卡片（16:9 静态帧）：读 pages.json → 逐页渲染 → PNG
//
// 用法:
//   node scripts/generate-video-cards.mjs --input output/video-proto/pages.json --outdir output/video-proto/cards
//   node scripts/generate-video-cards.mjs --input pages.json --only 5        # 只出第 5 页
//   node scripts/generate-video-cards.mjs --input pages.json --contact-sheet # 额外拼一张联系表
//
// 版式来自「硅基乌云」7 分钟长视频拆解：顶带 kicker + 页码，中带左栏文字右栏插画，
// 底带留空给 libass 烧字幕（卡片本身不画字幕，避免叠两层）。

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const WIDTH = 1920
const HEIGHT = 1080
const PAD_X = 88
const TOP_BAND = 96
const SUBTITLE_SAFE = 128
const LEFT_COL = 660
const COL_GAP = 56

const ACCENT = '#E85D04'
const INK = '#111111'
const MUTED = '#8A8A8A'
const FILL = '#F1F1F1'

// 闸门：文案超限时报错停下，而不是静默出丑图
const MAX_ITEM_CHARS = 14
const MAX_ITEMS = 5
const MIN_TITLE_SCALE = 0.8

function parseArgs(argv) {
  const out = { input: null, outdir: 'output/video-proto/cards', only: null, contactSheet: false }
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--input':
      case '-i':
        out.input = argv[++i]
        break
      case '--outdir':
      case '-o':
        out.outdir = argv[++i]
        break
      case '--only':
        out.only = Number(argv[++i])
        break
      case '--contact-sheet':
        out.contactSheet = true
        break
      default:
        throw new Error(`未知参数: ${argv[i]}`)
    }
  }
  if (!out.input) throw new Error('缺少 --input <pages.json>')
  return out
}

function shuheitiFontFaceCss() {
  const woff2 = `file://${path.join(ROOT, 'public', 'fonts', 'AlimamaShuHeiTi-Bold.woff2')}`
  const ttf = `file://${path.join(ROOT, 'public', 'fonts', 'AlimamaShuHeiTi-Bold.ttf')}`
  return `@font-face{font-family:'Alimama ShuHeiTi';src:url('${woff2}') format('woff2'),url('${ttf}') format('truetype');font-weight:400 700;font-style:normal;font-display:block;}`
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function validate(page) {
  const where = `第 ${page.index} 页`
  if (!page.title) throw new Error(`${where}: 缺少 title`)
  const items = page.items ?? []
  if (items.length > MAX_ITEMS) throw new Error(`${where}: 列表 ${items.length} 项，超过 ${MAX_ITEMS} 项上限`)
  for (const it of items) {
    const n = [...String(it)].length
    if (n > MAX_ITEM_CHARS) throw new Error(`${where}: 列表项「${it}」${n} 字，超过 ${MAX_ITEM_CHARS} 字上限，请改文案而不是缩字号`)
  }
}

function buildHtml(page) {
  const midH = HEIGHT - TOP_BAND - SUBTITLE_SAFE
  const rightCol = WIDTH - PAD_X * 2 - LEFT_COL - COL_GAP
  const leadSolid = page.leadStyle === 'solid'
  const artUrl = page.art ? `file://${path.resolve(ROOT, page.art)}` : null

  const items = (page.items ?? [])
    .map(
      (t, i) => `<li class="item"><span class="num">${String(i + 1).padStart(2, '0')}</span><span class="txt">${esc(t)}</span></li>`,
    )
    .join('')

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Inter:wght@500;600;700&display=swap" rel="stylesheet" />
<style>
${shuheitiFontFaceCss()}
*{margin:0;padding:0;box-sizing:border-box}
body{background:#fff}
#card{width:${WIDTH}px;height:${HEIGHT}px;background:#fff;position:relative;
  font-family:"Noto Sans SC","PingFang SC","Helvetica Neue",sans-serif;color:${INK};overflow:hidden}

.top{height:${TOP_BAND}px;padding:0 ${PAD_X}px;display:flex;align-items:center;justify-content:space-between}
.kicker{font-family:Inter,sans-serif;font-weight:600;font-size:20px;letter-spacing:3.2px;
  text-transform:uppercase;color:${MUTED}}
.pageno{font-family:Inter,sans-serif;font-weight:700;font-size:21px;letter-spacing:1px;color:#fff;
  background:${ACCENT};border-radius:999px;padding:7px 18px}

.mid{height:${midH}px;padding:0 ${PAD_X}px;display:flex;flex-direction:column}
.rule{width:96px;height:5px;background:${ACCENT};border-radius:3px;margin-bottom:22px}
.big-title{font-family:'Alimama ShuHeiTi',"Noto Sans SC",sans-serif;font-weight:700;
  font-size:78px;line-height:1.14;letter-spacing:-0.5px;white-space:nowrap;width:max-content;margin-bottom:40px}

.cols{flex:1;display:flex;gap:${COL_GAP}px;min-height:0}
.left{width:${LEFT_COL}px;display:flex;flex-direction:column;gap:26px;justify-content:flex-start}
.right{width:${rightCol}px;display:flex;flex-direction:column;gap:22px;min-height:0}
.art{flex:1;display:flex;align-items:center;justify-content:center;min-height:0}
.art img{max-width:100%;max-height:100%;object-fit:contain}

.lead{font-size:36px;font-weight:700;line-height:1.45;padding:26px 30px;border-radius:16px;
  ${leadSolid ? `background:${FILL};border:3px solid transparent;` : `background:#fff;border:3px solid ${ACCENT};`}}

.items{background:#FAFAFA;border-radius:16px;padding:30px;display:flex;flex-direction:column;gap:26px}
.item{list-style:none;display:flex;align-items:center;gap:20px}
.num{flex:0 0 auto;width:36px;height:36px;border-radius:9px;background:${INK};color:#fff;
  font-family:Inter,sans-serif;font-size:17px;font-weight:700;display:flex;align-items:center;justify-content:center}
.txt{font-size:32px;font-weight:500;color:#2A2A2A;white-space:nowrap}

/* 插图下方说明框：参考视频用它承接一句结论，同时把右栏底部撑满 */
.artnote{flex:0 0 auto;border-left:6px solid ${ACCENT};background:#FFF8F3;border-radius:10px;
  padding:18px 24px;font-size:28px;font-weight:600;color:#3A3A3A}

/* 底带：字幕安全区。卡片本身留空，字幕由 libass 后期烧入；
   subtitlePreview 仅用于给人看单帧效果，正式出片不要传这个字段 */
.safe{height:${SUBTITLE_SAFE}px;display:flex;align-items:center;justify-content:center}
.sub{background:rgba(24,24,24,0.86);color:#fff;font-size:34px;font-weight:500;
  letter-spacing:0.5px;padding:14px 30px;border-radius:12px}
</style></head>
<body><div id="card">
  <div class="top">
    <div class="kicker">${esc(page.kicker ?? '')}</div>
    <div class="pageno">${String(page.index).padStart(2, '0')} / ${page.total}</div>
  </div>
  <div class="mid">
    <div class="rule"></div>
    <div class="big-title"><span class="line">${esc(page.title)}</span></div>
    <div class="cols">
      <div class="left">
        ${page.lead ? `<div class="lead">${esc(page.lead)}</div>` : ''}
        ${items ? `<ul class="items">${items}</ul>` : ''}
      </div>
      <div class="right">
        <div class="art">${artUrl ? `<img src="${artUrl}" alt="" />` : ''}</div>
        ${page.artNote ? `<div class="artnote">${esc(page.artNote)}</div>` : ''}
      </div>
    </div>
  </div>
  <div class="safe">${page.subtitlePreview ? `<div class="sub">${esc(page.subtitlePreview)}</div>` : ''}</div>
</div></body></html>`
}

// 大标题逐级缩字：先降字号，仍超出再用 scale 压进去（沿用 generate-cover.mjs 的做法）
async function fitTitle(pageObj) {
  return pageObj.evaluate(
    ({ padX, minScale }) => {
      const line = document.querySelector('.big-title .line')
      const title = document.querySelector('.big-title')
      if (!line || !title) return { ok: false, reason: 'missing-title' }
      const targetW = window.innerWidth - padX * 2
      let size = parseFloat(getComputedStyle(title).fontSize) || 78
      let guard = 0
      while (line.scrollWidth > targetW && size > 44 && guard < 120) {
        size -= 2
        title.style.fontSize = `${size}px`
        guard += 1
      }
      const need = Math.max(line.scrollWidth, 1)
      const scale = need > targetW ? targetW / need : 1
      if (scale < 1) {
        line.style.display = 'inline-block'
        line.style.transformOrigin = 'left top'
        line.style.transform = `scale(${scale})`
      }
      return { ok: scale >= minScale, fontSize: size, scale, minScale }
    },
    { padX: PAD_X, minScale: MIN_TITLE_SCALE },
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const raw = await readFile(path.resolve(ROOT, args.input), 'utf8')
  const all = JSON.parse(raw)
  const pages = Array.isArray(all) ? all : all.pages
  const total = pages.length
  const targets = args.only ? pages.filter((p) => p.index === args.only) : pages
  if (!targets.length) throw new Error(`--only ${args.only} 没有匹配的页`)

  const outdir = path.resolve(ROOT, args.outdir)
  await mkdir(outdir, { recursive: true })

  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const written = []
  try {
    const pageObj = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 })
    for (const p of targets) {
      p.total = p.total ?? total
      validate(p)
      const html = buildHtml(p)
      const tmp = path.join(outdir, `.p${String(p.index).padStart(2, '0')}.html`)
      await writeFile(tmp, html, 'utf8')
      await pageObj.goto(`file://${tmp}`, { waitUntil: 'networkidle' })
      await pageObj.evaluate(async () => {
        if (document.fonts?.ready) await document.fonts.ready
        if (document.fonts?.load) {
          await document.fonts.load('700 78px "Alimama ShuHeiTi"')
          await document.fonts.load('500 26px "Noto Sans SC"')
        }
      })
      const fit = await fitTitle(pageObj)
      if (!fit.ok) {
        throw new Error(
          `第 ${p.index} 页标题压缩到 scale=${fit.scale?.toFixed(3)}（下限 ${MIN_TITLE_SCALE}）：标题太长，请改文案`,
        )
      }
      await pageObj.waitForTimeout(200)
      const out = path.join(outdir, `p${String(p.index).padStart(2, '0')}.png`)
      await pageObj.locator('#card').screenshot({ path: out, type: 'png' })
      written.push(out)
      console.log(`p${String(p.index).padStart(2, '0')}  字号 ${fit.fontSize}px  scale ${fit.scale.toFixed(3)}  → ${path.relative(ROOT, out)}`)
    }
  } finally {
    await browser.close()
  }
  console.log(`\n完成 ${written.length} 张`)
}

main().catch((e) => {
  console.error(`generate-video-cards: ${e.message}`)
  process.exit(1)
})
