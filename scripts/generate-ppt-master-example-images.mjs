#!/usr/bin/env node
/**
 * 拉取 ppt-master 示例 deck 的封面 SVG，渲染为 PNG 供 Era 混排。
 */
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const RAW =
  'https://raw.githubusercontent.com/hugohe3/ppt-master/main/examples'
const CONTENT_WIDTH = 888
const SLIDE_WIDTH = 1920
const SLIDE_HEIGHT = 1080

const EXAMPLES = [
  {
    id: 'magazine',
    project: 'ppt169_pritzker_2026',
    alt: '杂志风封面 — 普利兹克奖 2026',
    caption: '杂志风封面：建筑摄影 + 排版网格，冷静克制的编辑感。',
  },
  {
    id: 'swiss',
    project: 'ppt169_swiss_grid_systems',
    alt: '瑞士风封面 — 网格系统入门',
    caption: '瑞士风封面：严格栅格，克制字体，红色点缀。',
  },
]

function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function scaleToContentWidth(width, height) {
  const drawWidth = CONTENT_WIDTH
  const drawHeight = Math.round((height * drawWidth) / width)
  return { drawWidth, drawHeight }
}

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`下载失败 ${res.status}: ${url}`)
  return res.text()
}

async function renderCoverSvg(project) {
  const svgUrl = `${RAW}/${project}/svg_final/01_cover.svg`
  const svg = await fetchText(svgUrl)
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({
      viewport: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
      deviceScaleFactor: 2,
    })
    const html = `<!DOCTYPE html><html><head><style>
      html,body{margin:0;padding:0;background:#111;overflow:hidden}
      body{width:${SLIDE_WIDTH}px;height:${SLIDE_HEIGHT}px;display:flex;align-items:center;justify-content:center}
      svg{width:100%;height:100%;display:block}
    </style></head><body>${svg}</body></html>`
    await page.setContent(html, { waitUntil: 'load' })
    await page.waitForTimeout(300)
    const png = await page.screenshot({ type: 'png' })
    return Buffer.from(png)
  } finally {
    await browser.close()
  }
}

async function main() {
  const outDir = path.join(ROOT, 'output')
  await mkdir(outDir, { recursive: true })

  const items = []
  for (const ex of EXAMPLES) {
    const png = await renderCoverSvg(ex.project)
    const { width, height } = pngSize(png)
    const { drawWidth, drawHeight } = scaleToContentWidth(width, height)
    const outPath = path.join(outDir, `ppt-master-cover-${ex.id}.png`)
    await writeFile(outPath, png)
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`
    items.push({
      id: ex.id,
      project: ex.project,
      path: outPath,
      sourceUrl: `${RAW}/${ex.project}/svg_final/01_cover.svg`,
      alt: ex.alt,
      caption: ex.caption,
      width,
      height,
      drawWidth,
      drawHeight,
      dataUrl,
      markdown: `![${ex.alt}](${dataUrl} =${drawWidth}x${drawHeight})`,
    })
    console.log(`已渲染封面: ${outPath} (${width}×${height} → ${drawWidth}×${drawHeight})`)
  }

  const jsonPath = path.join(outDir, 'ppt-master-example-images.json')
  await writeFile(jsonPath, JSON.stringify({ examples: items }, null, 2), 'utf8')
  console.log(`JSON: ${jsonPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
