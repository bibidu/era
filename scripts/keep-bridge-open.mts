import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://127.0.0.1:5173/era/'

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security'],
  })
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  // 保活：进程不退出，供 Bridge WebSocket 使用
  // eslint-disable-next-line no-console
  console.log(`[keep-bridge] open ${url}`)
  await new Promise(() => {})
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
