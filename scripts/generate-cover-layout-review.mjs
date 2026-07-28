#!/usr/bin/env node
/**
 * 生成封面布局说明图：左侧完整 9:16（标注上下留白 + 中心 3:4），右侧主页预览裁切。
 */
import { chromium } from 'playwright'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const COVER = process.argv[2] || path.join(ROOT, 'output', 'cover-webnovel.png')
const OUT = process.argv[3] || path.join(ROOT, 'output', 'cover-layout-review.png')

const W = 1080
const H = 1920
const CORE_INSET_X = 50
const CORE_W = W - CORE_INSET_X * 2
const CORE_H = Math.round((CORE_W * 4) / 3)
const CORE_TOP = Math.round((H - CORE_H) / 2)

function toDataUrl(buf) {
  return `data:image/png;base64,${buf.toString('base64')}`
}

async function main() {
  const buf = await readFile(COVER)
  const png = PNG.sync.read(buf)
  // Extract center 3:4 crop
  const crop = new PNG({ width: CORE_W, height: CORE_H })
  for (let y = 0; y < CORE_H; y++) {
    for (let x = 0; x < CORE_W; x++) {
      const si = (png.width * (y + CORE_TOP) + (x + CORE_INSET_X)) << 2
      const di = (CORE_W * y + x) << 2
      crop.data[di] = png.data[si]
      crop.data[di + 1] = png.data[si + 1]
      crop.data[di + 2] = png.data[si + 2]
      crop.data[di + 3] = 255
    }
  }
  const cropBuf = PNG.sync.write(crop)
  const cropPath = path.join(path.dirname(OUT), 'cover-preview-3x4.png')
  await mkdir(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(cropPath, cropBuf)

  const topPct = ((CORE_TOP / H) * 100).toFixed(1)
  const corePct = ((CORE_H / H) * 100).toFixed(1)

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 1600px; height: 1100px; background: #1a1a1a; color: #fff; font-family: ui-sans-serif, system-ui, sans-serif; }
  .wrap { display: flex; gap: 48px; padding: 40px 48px; height: 100%; align-items: center; justify-content: center; }
  .col { display: flex; flex-direction: column; gap: 16px; align-items: center; }
  .label { font-size: 22px; font-weight: 700; letter-spacing: 0.02em; }
  .sub { font-size: 15px; opacity: 0.7; }
  .stage { position: relative; background: #111; }
  .stage.full { width: 405px; height: 720px; }
  .stage.crop { width: 405px; height: 540px; }
  .stage img { width: 100%; height: 100%; display: block; }
  .overlay { position: absolute; inset: 0; pointer-events: none; }
  .band { position: absolute; left: 0; right: 0; background: rgba(34, 197, 94, 0.28); }
  .band.top { top: 0; height: ${topPct}%; }
  .band.bot { bottom: 0; height: ${topPct}%; }
  .safe { position: absolute; left: 0; right: 0; top: ${topPct}%; height: ${corePct}%; border: 3px solid #ef4444; box-sizing: border-box; }
  .tag { position: absolute; left: 10px; padding: 4px 8px; font-size: 12px; font-weight: 700; border-radius: 4px; }
  .tag.green { background: #16a34a; top: 8px; }
  .tag.red { background: #ef4444; top: 14%; }
  .tag.green2 { background: #16a34a; bottom: 8px; }
</style></head>
<body>
  <div class="wrap">
    <div class="col">
      <div class="label">完整导出 9:16（1080×1920）</div>
      <div class="sub">绿 = 仅背景+网格的上下留白 · 红框 = 核心 3:4</div>
      <div class="stage full">
        <img src="${toDataUrl(buf)}" />
        <div class="overlay">
          <div class="band top"></div>
          <div class="band bot"></div>
          <div class="safe"></div>
          <div class="tag green">留白 ${CORE_TOP}px</div>
          <div class="tag red">核心 3:4 · ${CORE_W}×${CORE_H} · 左右各 ${CORE_INSET_X}px</div>
          <div class="tag green green2">留白 ${CORE_TOP}px</div>
        </div>
      </div>
    </div>
    <div class="col">
      <div class="label">主页预览裁切 ≈ 中心 3:4</div>
      <div class="sub">从完整图中心裁出，应包含全部核心内容</div>
      <div class="stage crop">
        <img src="${toDataUrl(cropBuf)}" />
      </div>
    </div>
  </div>
</body></html>`

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: 'load' })
    await page.screenshot({ path: OUT, type: 'png' })
  } finally {
    await browser.close()
  }
  console.log(JSON.stringify({ ok: true, review: OUT, preview3x4: cropPath }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
