/**
 * 浏览器冒烟：打开拼图 Tab，注入色块图，拼接并校验结果尺寸。
 * 用法：先 `npx vite preview --host 127.0.0.1 --port 4173`，再 `node scripts/smoke-image-stitch.mjs`
 */
import { chromium } from 'playwright'

const BASE = process.env.STITCH_SMOKE_URL || 'http://127.0.0.1:4173/?tab=stitch'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto(BASE, { waitUntil: 'networkidle' })

await page.waitForSelector('text=纵向拼图')

await page.evaluate(async () => {
  function solidPng(width, height, fill) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, width, height)
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
  }

  const blobs = await Promise.all([
    solidPng(200, 100, '#ff0000'),
    solidPng(200, 150, '#00ff00'),
    solidPng(100, 80, '#0000ff'),
  ])
  const files = blobs.map(
    (blob, i) => new File([blob], `smoke-${i + 1}.png`, { type: 'image/png' }),
  )
  const dt = new DataTransfer()
  for (const file of files) dt.items.add(file)
  const input = document.querySelector('input[type="file"]')
  if (!input) throw new Error('file input missing')
  input.files = dt.files
  input.dispatchEvent(new Event('change', { bubbles: true }))
})

await page.waitForSelector('text=按顺序纵向拼接（3 张）')
await page.getByRole('button', { name: /按顺序纵向拼接/ }).click()
await page.waitForSelector('img[alt="纵向拼图结果"]')

const meta = await page.locator('text=/结果 \\d+×\\d+/').first().textContent()
console.log('result meta:', meta)
// max width 200; heights 100 + 150 + (80 * 200/100)=160 => 410
if (!meta || !/结果\s+200×410/.test(meta)) {
  throw new Error(`expected 200×410, got: ${meta}`)
}

console.log('image stitch smoke ok')
await browser.close()
