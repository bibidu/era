import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security'],
  })
  const page = await browser.newPage()
  page.on('console', (msg) => console.log('CONSOLE', msg.type(), msg.text()))
  page.on('pageerror', (err) => console.log('PAGEERROR', err.message))
  page.on('requestfailed', (req) => console.log('FAIL', req.url(), req.failure()?.errorText))
  await page.goto('http://127.0.0.1:5173/era/', { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(4000)
  const info = await page.evaluate(() => ({
    href: location.href,
    ready: document.readyState,
    text: document.body?.innerText?.slice(0, 300),
  }))
  console.log('PAGE', info)
  const health = await fetch('http://127.0.0.1:3847/health').then((r) => r.json())
  console.log('HEALTH', health)
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
