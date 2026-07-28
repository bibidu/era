#!/usr/bin/env node
/**
 * 封面skill 渲染器：按瑞士/技术编辑风生成 9:16 社媒封面 PNG。
 * 画布 9:16；背景色+正方形网格铺满全图；其余核心内容落在上下居中、
 * 左右各留 50px 的 3:4 区域，对齐社媒主页预览裁切并增强中心感。
 *
 * 用法：
 *   node scripts/generate-cover.mjs --input cover.json --out output/cover.png
 *   node scripts/generate-cover.mjs --bigTitle "SEEDANCE" --smallTitle "AI 视频导演流" ...
 *
 * JSON / CLI 字段见下方 DEFAULTS。
 */

import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const WIDTH = 1080
const HEIGHT = 1920
/** 核心 3:4 区左右内缩，增强中心感 */
const CORE_INSET_X = 50
/** 个人主页预览裁切：左右各留 20px、上下居中的 3:4 核心区 */
const CORE_WIDTH = WIDTH - CORE_INSET_X * 2
const CORE_HEIGHT = Math.round((CORE_WIDTH * 4) / 3)
const CORE_TOP = Math.round((HEIGHT - CORE_HEIGHT) / 2)
const CORE_LEFT = CORE_INSET_X

/** 适合社媒的主题色池（未指定时随机） */
const THEME_COLORS = [
  { name: '焦橙', hex: '#E85D04' },
  { name: '明黄', hex: '#F4A261' },
  { name: '翠绿', hex: '#2D6A4F' },
  { name: '宝蓝', hex: '#1D4ED8' },
  { name: '紫靛', hex: '#6D28D9' },
  { name: '玫红', hex: '#BE123C' },
  { name: '青绿', hex: '#0F766E' },
  { name: '珊瑚', hex: '#E11D48' },
]

const DEFAULTS = {
  bigTitle: 'COVER SKILL',
  bigTitleColor: '#111111',
  bigTitleLineColors: null,
  blobCorner: null,
  smallTitle: '',
  description: '',
  tags: [],
  secondaryTitles: [],
  themeColor: null,
  badge: 'skill',
  out: path.join(ROOT, 'output', 'cover.png'),
}

function parseArgs(argv) {
  const out = { ...DEFAULTS }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    switch (a) {
      case '--input':
      case '-i':
        out.input = next()
        break
      case '--out':
      case '-o':
        out.out = path.resolve(next())
        break
      case '--bigTitle':
        out.bigTitle = next()
        break
      case '--bigTitleColor':
        out.bigTitleColor = next()
        break
      case '--bigTitleLineColors':
        out.bigTitleLineColors = next()
          .split(/[,，|]/)
          .map((s) => s.trim())
          .filter(Boolean)
        break
      case '--smallTitle':
        out.smallTitle = next()
        break
      case '--description':
        out.description = next()
        break
      case '--tags':
        out.tags = next()
          .split(/[,，|]/)
          .map((s) => s.trim())
          .filter(Boolean)
        break
      case '--secondaryTitles':
        out.secondaryTitles = next()
          .split(/[,，|]/)
          .map((s) => s.trim())
          .filter(Boolean)
        break
      case '--themeColor':
        out.themeColor = next()
        break
      case '--blobCorner':
        out.blobCorner = next()
        break
      case '--badge':
        out.badge = next()
        break
      case '--help':
      case '-h':
        out.help = true
        break
      default:
        if (a.startsWith('-')) throw new Error(`未知参数: ${a}`)
    }
  }
  return out
}

function pickTheme(themeColor) {
  if (themeColor && /^#?[0-9a-fA-F]{6}$/.test(themeColor.trim())) {
    const hex = themeColor.startsWith('#') ? themeColor : `#${themeColor}`
    return { name: '自定义', hex }
  }
  if (themeColor) {
    const hit = THEME_COLORS.find(
      (c) => c.name === themeColor || c.hex.toLowerCase() === themeColor.toLowerCase(),
    )
    if (hit) return hit
  }
  return THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)]
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function normalizeHex(color, fallback = '#111111') {
  if (!color || typeof color !== 'string') return fallback
  const c = color.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c
  if (/^[0-9a-fA-F]{6}$/.test(c)) return `#${c}`
  return fallback
}

/**
 * 解析大标题行。支持：
 * - 字符串（\\n 分行）
 * - 字符串数组
 * - { text, color? } 数组（单行可指定颜色）
 * - 配合 bigTitleLineColors / bigTitleColor
 */
function bigTitleLines(raw, cfg) {
  const defaultColor = normalizeHex(cfg.bigTitleColor, '#111111')
  const lineColors = Array.isArray(cfg.bigTitleLineColors)
    ? cfg.bigTitleLineColors
    : typeof cfg.bigTitleLineColors === 'string'
      ? cfg.bigTitleLineColors.split(/[,，|]/).map((s) => s.trim()).filter(Boolean)
      : []

  let items = []
  if (Array.isArray(raw)) {
    items = raw.map((item) => {
      if (item && typeof item === 'object') {
        return {
          text: String(item.text ?? item.title ?? '').trim(),
          color: item.color ? normalizeHex(item.color, defaultColor) : null,
        }
      }
      return { text: String(item ?? '').trim(), color: null }
    })
  } else {
    const text = String(raw ?? '').trim()
    items = text
      ? text
          .split(/\r?\n|\\n/)
          .map((l) => ({ text: l.trim(), color: null }))
          .filter((l) => l.text)
      : []
  }

  if (!items.length) items = [{ text: 'TITLE', color: null }]

  return items.map((item, i) => ({
    text: item.text,
    color: item.color || normalizeHex(lineColors[i], defaultColor) || defaultColor,
  }))
}

function footerIcon(i) {
  const icons = [
    // document
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h7l5 5v13H7V3z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>`,
    // shield
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/></svg>`,
    // upload / arrow
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V5"/><path d="M7 9l5-5 5 5"/><path d="M5 19h14"/></svg>`,
    // chart
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15v-4M12 15V8M16 15v-7"/></svg>`,
    // star
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 18l.9-5.4L4.2 8.7l5.4-.8L12 3z"/></svg>`,
    // layers
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/></svg>`,
  ]
  return icons[i % icons.length]
}

function buildHtml(cfg, theme) {
  const lines = bigTitleLines(cfg.bigTitle, cfg)
  const lineCount = lines.length
  // 再收一档
  const titleSize =
    lineCount <= 1 ? 280 : lineCount === 2 ? 220 : lineCount === 3 ? 190 : 160
  const titleLh = 0.96
  const titleLineGap = lineCount <= 1 ? 0 : lineCount === 2 ? 10 : 14
  const smallTitleSize = 56

  // 装饰圆：再略收；右上 / 右下随机
  const blobCorner =
    cfg.blobCorner === 'top-right' || cfg.blobCorner === 'bottom-right'
      ? cfg.blobCorner
      : Math.random() < 0.5
        ? 'top-right'
        : 'bottom-right'
  const blobSize = 680
  const blobOut = Math.round(blobSize * 0.32)
  const blobPos =
    blobCorner === 'top-right'
      ? `top:-${blobOut}px;right:-${blobOut}px;bottom:auto;left:auto;`
      : `bottom:-${Math.round(blobSize * 0.25)}px;right:-${blobOut}px;top:auto;left:auto;`
  const arcPos =
    blobCorner === 'top-right'
      ? 'top:48px;right:28px;bottom:auto;'
      : 'bottom:300px;right:28px;top:auto;'
  const dotsTrExtra =
    blobCorner === 'top-right' ? 'top:auto;bottom:56px;right:56px;' : ''
  const dotsBlExtra =
    blobCorner === 'bottom-right' ? 'bottom:auto;top:56px;left:56px;' : ''

  const tagsHtml =
    cfg.tags.length > 0
      ? `<div class="tags">${cfg.tags.map((t) => escapeHtml(t)).join('<span class="dot">·</span>')}</div>`
      : ''

  const secondary = cfg.secondaryTitles.slice(0, 4)
  const footerHtml =
    secondary.length > 0
      ? `<footer class="footer">${secondary
          .map(
            (t, i) =>
              `<div class="foot-item">${footerIcon(i)}<span>${escapeHtml(t)}</span></div>`,
          )
          .join('<div class="vdiv"></div>')}</footer>`
      : ''

  const smallTitleHtml = cfg.smallTitle
    ? `<h2 class="small-title">${escapeHtml(cfg.smallTitle)}</h2>`
    : ''
  const descHtml = cfg.description
    ? `<p class="desc">${escapeHtml(cfg.description)}</p>`
    : ''

  const titleHtml = lines
    .map((l) => {
      const hasCjk = /[\u3400-\u9FFF]/.test(l.text)
      const cls = hasCjk ? 'line cjk' : 'line'
      return `<span class="${cls}" style="color:${escapeHtml(l.color)}">${escapeHtml(l.text)}</span>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${WIDTH}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Noto+Sans+SC:wght@400;500;700;900&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    background: #F6F4EF;
  }
  .cover {
    position: relative;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    background: #F6F4EF;
    color: #111;
    font-family: "Noto Sans SC", "PingFang SC", "Helvetica Neue", sans-serif;
    overflow: hidden;
  }

  /*
   * 全画布仅保留：背景色 + 正方形网格。
   * 其余全部落入上下居中、左右各留 50px 的 3:4 核心区（社媒主页预览裁切区）。
   */
  .hatch {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to right, color-mix(in srgb, ${theme.hex} 12%, transparent) 1px, transparent 1px),
      linear-gradient(to bottom, color-mix(in srgb, ${theme.hex} 12%, transparent) 1px, transparent 1px);
    background-size: 72px 72px;
    background-position: 0 0;
    opacity: 0.5;
    pointer-events: none;
    z-index: 0;
  }

  .core {
    position: absolute;
    top: ${CORE_TOP}px;
    left: ${CORE_LEFT}px;
    width: ${CORE_WIDTH}px;
    height: ${CORE_HEIGHT}px;
    overflow: hidden;
    z-index: 1;
  }

  /* 3:4 核心区外框（贴齐核心边界，方便识别主页预览裁切区） */
  .core-frame {
    position: absolute;
    inset: 0;
    border: 2px solid color-mix(in srgb, ${theme.hex} 55%, transparent);
    pointer-events: none;
    z-index: 3;
  }

  /* 核心区内技术十字线 */
  .grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .grid::before, .grid::after {
    content: "";
    position: absolute;
    background: color-mix(in srgb, ${theme.hex} 28%, transparent);
  }
  .grid::before {
    left: 50%; top: 0; bottom: 0; width: 1px;
    transform: translateX(-0.5px);
  }
  .grid::after {
    top: 42%; left: 0; right: 0; height: 1px;
  }

  .dots {
    position: absolute;
    width: 88px;
    height: 88px;
    background-image: radial-gradient(#1a1a1a 1.6px, transparent 1.7px);
    background-size: 14px 14px;
    opacity: 0.55;
  }
  .dots.tr { top: 56px; right: 56px; ${dotsTrExtra} }
  .dots.bl { bottom: 160px; left: 56px; width: 56px; height: 56px; opacity: 0.4; ${dotsBlExtra} }

  .blob {
    position: absolute;
    width: ${blobSize}px;
    height: ${blobSize}px;
    border-radius: 50%;
    background: ${theme.hex};
    ${blobPos}
  }
  .arc-lines {
    position: absolute;
    width: 450px;
    height: 450px;
    border: 1.5px solid color-mix(in srgb, ${theme.hex} 55%, transparent);
    border-radius: 50%;
    opacity: 0.7;
    ${arcPos}
  }
  .arc-lines::before {
    content: "";
    position: absolute;
    inset: 52px;
    border: 1.5px solid color-mix(in srgb, ${theme.hex} 40%, transparent);
    border-radius: 50%;
  }

  .content {
    position: relative;
    z-index: 2;
    height: 100%;
    padding: 48px 28px 48px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .badge {
    align-self: flex-start;
    background: ${theme.hex};
    color: #fff;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 8px 18px;
    border-radius: 0;
    line-height: 1;
    text-transform: lowercase;
  }

  .big-title {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: ${titleLineGap}px;
    font-family: "Anton", "Noto Sans SC", "Impact", "Arial Narrow", sans-serif;
    font-weight: 400;
    font-size: ${titleSize}px;
    line-height: ${titleLh};
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: ${normalizeHex(cfg.bigTitleColor, '#111111')};
    max-width: none;
    width: max-content;
    flex: 0 0 auto;
    transform-origin: left top;
  }
  .big-title .line { display: block; white-space: nowrap; }
  .big-title .line.cjk {
    font-family: "Noto Sans SC", "PingFang SC", "Helvetica Neue", sans-serif;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-transform: none;
  }
  /* 彩色标题压在主题色块上时保持可读 */
  .big-title .line[style*="color:#"],
  .big-title .line[style*="color: #"] {
    -webkit-text-stroke: 1px rgba(246, 244, 239, 0.35);
  }

  .info {
    margin-top: 140px;
    max-width: 920px;
    flex: 0 0 auto;
    position: relative;
    z-index: 2;
  }
  .accent-line {
    width: 64px;
    height: 5px;
    background: ${theme.hex};
    margin-bottom: 28px;
    border-radius: 2px;
  }
  .small-title {
    font-size: ${smallTitleSize}px;
    font-weight: 900;
    letter-spacing: 0.01em;
    line-height: 1.15;
    color: #111;
    white-space: nowrap;
    width: max-content;
    max-width: none;
  }
  .desc {
    margin-top: 14px;
    font-size: 28px;
    font-weight: 400;
    color: #222;
    line-height: 1.45;
    opacity: 0.88;
  }
  .tags {
    margin-top: 28px;
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 6px;
    background: color-mix(in srgb, #1a1a1a 6%, #F6F4EF);
    border: 1px solid color-mix(in srgb, #1a1a1a 10%, transparent);
    border-radius: 999px;
    padding: 14px 22px;
    font-size: 22px;
    font-weight: 500;
    color: #333;
    max-width: 100%;
  }
  .tags .dot {
    margin: 0 6px;
    opacity: 0.45;
  }

  .spacer { flex: 1; }

  .footer {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0;
    padding-top: 24px;
    border-top: 1.5px solid color-mix(in srgb, ${theme.hex} 30%, transparent);
    max-width: 640px;
  }
  .foot-item {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #1a1a1a;
    font-size: 20px;
    font-weight: 600;
    padding: 0 4px;
  }
  .foot-item svg {
    width: 22px;
    height: 22px;
    color: ${theme.hex};
    flex-shrink: 0;
  }
  .vdiv {
    width: 1px;
    height: 28px;
    background: color-mix(in srgb, #111 18%, transparent);
    margin: 0 18px;
  }
</style>
</head>
<body>
  <div class="cover" id="cover">
    <div class="hatch" aria-hidden="true"></div>
    <div class="core">
      <div class="grid"></div>
      <div class="dots tr"></div>
      <div class="dots bl"></div>
      <div class="blob"></div>
      <div class="arc-lines"></div>
      <div class="content">
        <div class="badge">${escapeHtml(cfg.badge || 'skill')}</div>
        <h1 class="big-title">${titleHtml}</h1>
        <div class="info">
          <div class="accent-line"></div>
          ${smallTitleHtml}
          ${descHtml}
          ${tagsHtml}
        </div>
        <div class="spacer"></div>
        ${footerHtml}
      </div>
      <div class="core-frame" aria-hidden="true"></div>
    </div>
  </div>
</body>
</html>`

  return { html, meta: { blobCorner, blobSize, titleSize, smallTitleSize } }
}

async function loadConfig(cli) {
  let data = { ...DEFAULTS, ...cli }
  if (cli.input) {
    const raw = await readFile(path.resolve(cli.input), 'utf8')
    const json = JSON.parse(raw)
    data = {
      ...data,
      ...json,
      tags: Array.isArray(json.tags)
        ? json.tags
        : typeof json.tags === 'string'
          ? json.tags.split(/[,，|]/).map((s) => s.trim()).filter(Boolean)
          : data.tags,
      secondaryTitles: Array.isArray(json.secondaryTitles)
        ? json.secondaryTitles
        : typeof json.secondaryTitles === 'string'
          ? json.secondaryTitles.split(/[,，|]/).map((s) => s.trim()).filter(Boolean)
          : data.secondaryTitles,
      bigTitleLineColors: Array.isArray(json.bigTitleLineColors)
        ? json.bigTitleLineColors
        : typeof json.bigTitleLineColors === 'string'
          ? json.bigTitleLineColors.split(/[,，|]/).map((s) => s.trim()).filter(Boolean)
          : data.bigTitleLineColors,
      out: cli.out !== DEFAULTS.out ? cli.out : json.out ? path.resolve(json.out) : data.out,
    }
  }
  return data
}

async function main() {
  const cli = parseArgs(process.argv.slice(2))
  if (cli.help) {
    console.log(`封面skill 生成器

Usage:
  node scripts/generate-cover.mjs --input cover.json
  node scripts/generate-cover.mjs \\
    --bigTitle "WEBNOVEL\\nWRITER" \\
    --bigTitleColor "#111111" \\
    --smallTitle "AI 长篇网文系统" \\
    --description "先建世界，再写几十章" \\
    --tags "世界观,地域,力量体系,长期记忆" \\
    --secondaryTitles "写作合约,审查闸门,章节提交" \\
    --themeColor "#E85D04" \\
    --out output/cover.png

字段:
  bigTitle          大标题（可多行，用 \\n 分隔），默认黑色
  bigTitleColor     大标题颜色，默认 #111111
  smallTitle        小标题
  description       描述
  tags              多个标签
  secondaryTitles   多个二级标题（页脚）
  themeColor        主题色 hex；省略则随机
  badge             左上角徽章文案，默认 skill
`)
    process.exit(0)
  }

  const cfg = await loadConfig(cli)
  const titleCheck = Array.isArray(cfg.bigTitle)
    ? cfg.bigTitle.length > 0
    : Boolean(cfg.bigTitle?.toString?.().trim?.())
  if (!titleCheck) {
    console.error('缺少 bigTitle')
    process.exit(1)
  }

  const theme = pickTheme(cfg.themeColor)
  const { html, meta } = buildHtml(cfg, theme)
  const outPath = path.resolve(cfg.out)
  await mkdir(path.dirname(outPath), { recursive: true })

  const tmpHtml = path.join(path.dirname(outPath), `.cover-render-${process.pid}.html`)
  await writeFile(tmpHtml, html, 'utf8')

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
    })
    await page.goto(`file://${tmpHtml}`, { waitUntil: 'networkidle' })
    // 等 Google Fonts
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready
    })
    // 最大化主标题，同时保证小标题/标签完整可见，并把剩余空间分给小标题上间距
    await page.evaluate(() => {
      const title = document.querySelector('.big-title')
      const content = document.querySelector('.content')
      const info = document.querySelector('.info')
      const badge = document.querySelector('.badge')
      const footer = document.querySelector('.footer')
      if (!title || !content || !info) return

      const innerW = content.clientWidth
      const innerH = content.clientHeight
      const badgeH = badge ? badge.getBoundingClientRect().height + 16 : 0
      const footerH = footer ? footer.getBoundingClientRect().height + 24 : 0

      // 先清空 transform 以便测原始尺寸
      title.style.transform = 'none'
      title.style.height = 'auto'
      title.style.width = 'max-content'

      const needW = Math.max(title.scrollWidth, 1)
      const needH = Math.max(title.scrollHeight, 1)
      const infoH = info.getBoundingClientRect().height
      const minGap = 80
      const targetGap = 140
      const reserved = badgeH + infoH + footerH + minGap + 8
      const availForTitle = Math.max(160, innerH - reserved)
      const s = Math.min(1, (innerW * 1.12) / needW, availForTitle / needH)

      title.style.transformOrigin = 'left top'
      title.style.transform = `scale(${s})`
      const scaledH = needH * s
      const scaledW = needW * s
      title.style.height = `${scaledH}px`
      title.style.width = `${scaledW}px`

      // 小标题过宽时同步缩放，避免换行裁切
      const small = info.querySelector('.small-title')
      if (small && small.scrollWidth > innerW) {
        const ss = innerW / small.scrollWidth
        small.style.transformOrigin = 'left top'
        small.style.transform = `scale(${ss})`
        small.style.height = `${small.offsetHeight * ss}px`
        small.style.width = `${small.scrollWidth * ss}px`
      }

      const infoH2 = info.getBoundingClientRect().height
      const used = badgeH + scaledH + infoH2 + footerH
      const gap = Math.max(minGap, Math.min(targetGap, innerH - used - 8))
      info.style.marginTop = `${Math.round(gap)}px`
    })
    await page.waitForTimeout(300)
    await page.locator('#cover').screenshot({ path: outPath, type: 'png' })
  } finally {
    await browser.close()
    try {
      const { unlink } = await import('node:fs/promises')
      await unlink(tmpHtml)
    } catch {
      /* ignore */
    }
  }

  const result = {
    ok: true,
    path: outPath,
    themeColor: theme.hex,
    themeName: theme.name,
    blobCorner: meta.blobCorner,
    titleSize: meta.titleSize,
    smallTitleSize: meta.smallTitleSize,
    size: {
      width: WIDTH,
      height: HEIGHT,
      aspectRatio: '9:16',
      core: {
        width: CORE_WIDTH,
        height: CORE_HEIGHT,
        top: CORE_TOP,
        left: CORE_LEFT,
        insetX: CORE_INSET_X,
        aspectRatio: '3:4',
      },
    },
  }
  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
