import { chromium } from 'playwright'
// @ts-expect-error 纯 JS 模块，无类型声明
import { ERA_AUTH_COOKIE, knownAuthHashes } from './era-auth-core.mjs'

const url = process.argv[2] ?? 'http://127.0.0.1:5173/era/'

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security'],
  })
  const context = await browser.newContext()
  // AuthGate 未登录时只渲染登录页，Bridge 所在的图文工作区不会挂载
  const authHash = process.env.ERA_AUTH_HASH?.trim() || [...knownAuthHashes()][0]
  await context.addCookies([
    {
      name: ERA_AUTH_COOKIE,
      value: authHash,
      url: new URL(url).origin,
      sameSite: 'Lax',
    },
  ])
  const page = await context.newPage()
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
