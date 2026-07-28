#!/usr/bin/env node
/**
 * 拉取 ppt-master 官网 README 展示的两张示例截图，转为 Era 混排用 dataURL JSON。
 */
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BASE =
  'https://raw.githubusercontent.com/hugohe3/ppt-master/main/docs/assets/screenshots'
const CONTENT_WIDTH = 888

const EXAMPLES = [
  {
    id: 'magazine',
    file: 'preview_pritzker_2026.png',
    alt: '杂志风示例 — 普利兹克奖 2026',
    caption: '杂志风：建筑摄影 + 排版网格，冷静克制的编辑感。',
  },
  {
    id: 'swiss',
    file: 'preview_swiss_grid.png',
    alt: '瑞士风示例 — 网格系统入门',
    caption: '瑞士风：严格栅格，克制字体，红色点缀。',
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

async function fetchPng(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`下载失败 ${res.status}: ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  return buf
}

async function main() {
  const outDir = path.join(ROOT, 'output')
  await mkdir(outDir, { recursive: true })

  const items = []
  for (const ex of EXAMPLES) {
    const url = `${BASE}/${ex.file}`
    const png = await fetchPng(url)
    const { width, height } = pngSize(png)
    const { drawWidth, drawHeight } = scaleToContentWidth(width, height)
    const outPath = path.join(outDir, `ppt-master-example-${ex.id}.png`)
    await writeFile(outPath, png)
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`
    items.push({
      id: ex.id,
      path: outPath,
      sourceUrl: url,
      alt: ex.alt,
      caption: ex.caption,
      width,
      height,
      drawWidth,
      drawHeight,
      dataUrl,
      markdown: `![${ex.alt}](${dataUrl} =${drawWidth}x${drawHeight})`,
    })
    console.log(`已缓存: ${outPath} (${width}×${height} → ${drawWidth}×${drawHeight})`)
  }

  const result = { examples: items }
  const jsonPath = path.join(outDir, 'ppt-master-example-images.json')
  await writeFile(jsonPath, JSON.stringify(result, null, 2), 'utf8')
  console.log(`JSON: ${jsonPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
