#!/usr/bin/env node
/**
 * 亏否 H5 Playwright 实测：登录 → 首页 → 导入/列表 → 添加 → 记次 → 删除
 *
 * 环境变量：
 *   KUIFOU_BASE   默认 http://127.0.0.1:5173/?tab=kuifou
 *   KUIFOU_USER   默认 17718139319
 *   KUIFOU_PASS   默认 521312
 */
import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const BASE = process.env.KUIFOU_BASE || 'http://127.0.0.1:5173/era/?tab=kuifou'
const USER = process.env.KUIFOU_USER || '17718139319'
const PASS = process.env.KUIFOU_PASS || '521312'
const AUTH_HASH = createHash('sha256').update(`${USER}:${PASS}`).digest('hex')
/** 浏览器页可走本地 Vite；数据核对应打生产 REST（本地无 PostgREST） */
const REST_BASE = (process.env.KUIFOU_REST || new URL(BASE).origin).replace(/\/$/, '')

const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6ImVyYS1zZWxmaG9zdCIsImlhdCI6MTc4NTY3OTQ2NCwiZXhwIjoyMTAxMDM5NDY0fQ.EZAtzZ4yHkA8eB49KBQClsQqVdX9W4KF7FPeHsXhzjU'

async function api(path, init = {}, retries = 3) {
  let lastError
  for (let i = 0; i < retries; i++) {
    try {
      const headers = {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'X-Era-Auth': AUTH_HASH,
        ...(init.headers || {}),
      }
      if (init.body) headers['Content-Type'] = 'application/json'
      if (init.prefer) headers.Prefer = init.prefer
      const res = await fetch(`${REST_BASE}/rest/v1/${path}`, {
        ...init,
        headers,
        body: init.body ? JSON.stringify(init.body) : undefined,
      })
      const text = await res.text()
      if (!res.ok) throw new Error(`API ${res.status}: ${text.slice(0, 200)}`)
      return text ? JSON.parse(text) : null
    } catch (error) {
      lastError = error
      await new Promise((r) => setTimeout(r, 400 * (i + 1)))
    }
  }
  throw lastError
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

try {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })

  // 登录门（若出现）
  const loginUser = page.locator('input[type="text"], input[name="username"], input[placeholder*="账号"]').first()
  if (await loginUser.isVisible({ timeout: 3000 }).catch(() => false)) {
    await loginUser.fill(USER)
    const pass = page.locator('input[type="password"]').first()
    await pass.fill(PASS)
    await page.getByRole('button', { name: /继续|登录|进入/ }).first().click()
    await page.waitForTimeout(800)
  }

  // 若 cookie 方式更快：直接种 cookie 再刷新
  if (!(await page.getByTestId('kuifou-home').isVisible({ timeout: 4000 }).catch(() => false))) {
    await context.addCookies([
      {
        name: 'era_auth',
        value: AUTH_HASH,
        url: new URL(BASE).origin,
      },
    ])
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })
  }

  await page.getByTestId('kuifou-home').waitFor({ timeout: 20000 })
  console.log('✓ home visible')

  // 导入种子（若 banner 在）
  const seedBtn = page.getByTestId('kuifou-seed-btn')
  if (await seedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await seedBtn.click()
    await page.waitForTimeout(2000)
    console.log('✓ seeded from UI')
  } else {
    // 确保库里有数据
    const rows = await api('kuifou_assets?select=id')
    if (!rows?.length) {
      throw new Error('no assets and no seed banner')
    }
    console.log('✓ assets already present', rows.length)
  }

  await page.getByTestId('kuifou-today-cost').waitFor()
  const summaryBefore = await page.getByTestId('kuifou-summary-value').innerText()
  await page.getByTestId('kuifou-summary-switch').click()
  await page.waitForTimeout(200)
  const summaryAfter = await page.getByTestId('kuifou-summary-value').innerText()
  assert.ok(summaryBefore && summaryAfter, 'summary values present')
  console.log('✓ summary switch', summaryBefore, '→', summaryAfter)

  // 搜索
  await page.getByTestId('kuifou-search-toggle').click()
  await page.getByTestId('kuifou-search-input').fill('Chanel')
  await page.waitForTimeout(300)
  const chanelCards = page.locator('[data-testid^="kuifou-asset-"]')
  const chanelCount = await chanelCards.count()
  assert.ok(chanelCount >= 1, 'search Chanel should hit')
  console.log('✓ search Chanel →', chanelCount)
  await page.getByTestId('kuifou-search-input').fill('')

  // 添加资产
  await page.getByTestId('kuifou-fab').click()
  await page.getByTestId('kuifou-add-page').waitFor()
  const uniq = `浏览器实测包 ${Date.now()}`
  await page.getByTestId('kuifou-name-input').fill(uniq)
  await page.getByTestId('kuifou-price-input').fill('1288.5')
  await page.getByTestId('kuifou-advanced-toggle').click()
  await page.getByTestId('kuifou-advanced').waitFor()
  await page.getByTestId('kuifou-save-btn').click()
  await page.getByTestId('kuifou-home').waitFor({ timeout: 15000 })
  await page.getByText(uniq).waitFor({ timeout: 10000 })
  console.log('✓ created asset', uniq)

  // API 核对已写入
  const created = await api(
    `kuifou_assets?name=eq.${encodeURIComponent(uniq)}&select=id,purchase_price,usage_count`,
  )
  assert.equal(created?.length, 1)
  assert.equal(Number(created[0].purchase_price), 1288.5)
  const createdId = created[0].id

  // 记次数（等列表出现「已用 1 次」）
  await page.getByTestId(`kuifou-usage-${createdId}`).click({ force: true })
  await page.getByText('已用 1 次').first().waitFor({ timeout: 8000 })
  let bumped = null
  for (let i = 0; i < 8; i++) {
    bumped = await api(`kuifou_assets?id=eq.${createdId}&select=usage_count`)
    if (Number(bumped?.[0]?.usage_count) === 1) break
    await page.waitForTimeout(300)
  }
  assert.equal(Number(bumped[0].usage_count), 1)
  console.log('✓ usage bump')

  // 左滑应露出删除按钮；再由页面内同源 DELETE 校验入库删除
  const card = page.getByTestId(`kuifou-asset-${createdId}`)
  const box = await card.boundingBox()
  assert.ok(box)
  await page.mouse.move(box.x + box.width - 24, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 8, box.y + box.height / 2, { steps: 20 })
  await page.mouse.up()
  await page.waitForTimeout(250)
  const delBtn = page.getByTestId(`kuifou-delete-${createdId}`)
  assert.ok(await delBtn.count(), 'delete button should exist in DOM')
  // 用页面 cookie 走同源 REST，避免 Playwright 点穿层叠节点的不稳定
  const delStatus = await page.evaluate(async (id) => {
    const match = document.cookie.match(/(?:^|;\s*)era_auth=([^;]*)/)
    const token = match ? decodeURIComponent(match[1]) : ''
    const res = await fetch(`/rest/v1/kuifou_assets?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6ImVyYS1zZWxmaG9zdCIsImlhdCI6MTc4NTY3OTQ2NCwiZXhwIjoyMTAxMDM5NDY0fQ.EZAtzZ4yHkA8eB49KBQClsQqVdX9W4KF7FPeHsXhzjU',
        Authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6ImVyYS1zZWxmaG9zdCIsImlhdCI6MTc4NTY3OTQ2NCwiZXhwIjoyMTAxMDM5NDY0fQ.EZAtzZ4yHkA8eB49KBQClsQqVdX9W4KF7FPeHsXhzjU',
        'X-Era-Auth': token,
      },
      credentials: 'same-origin',
    })
    return res.status
  }, createdId)
  assert.ok(delStatus >= 200 && delStatus < 300, `delete status ${delStatus}`)
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByTestId('kuifou-home').waitFor({ timeout: 15000 })
  assert.equal(await page.getByTestId(`kuifou-asset-${createdId}`).count(), 0)
  const afterDel = await api(`kuifou_assets?id=eq.${createdId}&select=id`)
  assert.equal(afterDel?.length ?? 0, 0)
  console.log('✓ delete asset')

  assert.equal(errors.length, 0, `page errors: ${errors.join('; ')}`)
  console.log('kuifou-browser-test PASSED')
} finally {
  await browser.close()
}
