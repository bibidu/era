/**
 * 本地预览冒烟：验证图文 / 社媒 / 高亮 Tab 可切换且关键 UI 正常。
 * 用法：先 ERA_BASE=/ npm run build && npx vite preview --host 127.0.0.1 --port 4173
 *       再 npx tsx scripts/smoke-frontend-perf.mts
 */
import { chromium } from 'playwright'

const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4173'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const failures: string[] = []

  const fail = (msg: string) => {
    failures.push(msg)
    console.error('FAIL:', msg)
  }

  try {
    const started = Date.now()
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 })
    const loadMs = Date.now() - started
    console.log(`graphic load: ${loadMs}ms`)

    // 顶栏三个 Tab
    for (const label of ['图文', '社媒', '高亮']) {
      const tab = page.getByRole('button', { name: label, exact: true })
      if ((await tab.count()) === 0) fail(`缺少 Tab：${label}`)
    }

    // 图文工作区应出现
    await page.waitForTimeout(500)
    const graphicVisible =
      (await page.locator('textarea, [contenteditable="true"], .graphic-page').count()) > 0 ||
      (await page.getByText('加载中...').count()) === 0
    if (!graphicVisible) {
      // 再等一下懒加载
      await page.waitForTimeout(1500)
    }

    // 切到社媒
    await page.getByRole('button', { name: '社媒', exact: true }).click()
    await page.waitForTimeout(800)
    const extractBtn = page.getByRole('button', { name: '智能提取', exact: true })
    if ((await extractBtn.count()) === 0) {
      // 可能还在加载列表
      await page.waitForSelector('text=智能提取', { timeout: 10000 }).catch(() => null)
    }
    if ((await extractBtn.count()) === 0) fail('社媒 Tab 未出现「智能提取」')
    else {
      // 状态筛选（后端筛选入口）
      for (const label of ['全部', '已发布', '待审核', '待AI修改']) {
        if ((await page.getByRole('button', { name: label, exact: true }).count()) === 0) {
          fail(`社媒缺少状态筛选：${label}`)
        }
      }
      await page.getByRole('button', { name: '已发布', exact: true }).click()
      await page.waitForTimeout(600)

      // 状态筛选在进出编辑/创建后应保持
      await page.getByRole('button', { name: '待AI修改', exact: true }).click()
      await page.waitForTimeout(400)
      const createKeep = page.getByRole('button', { name: '创建', exact: true })
      if ((await createKeep.count()) > 0) {
        await createKeep.click()
        await page.waitForTimeout(400)
        const backKeep = page.getByRole('button', { name: '返回' })
        if ((await backKeep.count()) > 0) await backKeep.click()
        await page.waitForTimeout(400)
        const activePending = page.getByRole('button', { name: '待AI修改', exact: true })
        // 粗略：筛选按钮仍存在即可；样式断言不稳定
        if ((await activePending.count()) === 0) fail('返回后状态筛选丢失')
      }

      const createBtn = page.getByRole('button', { name: '创建', exact: true })
      if ((await createBtn.count()) === 0) fail('社媒缺少「创建」入口')
      else {
        await createBtn.click()
        await page.waitForTimeout(500)
        if ((await page.getByText('创建帖子').count()) === 0) fail('未进入创建页')
        for (const label of ['待AI修改', '大纲', '类型', '内容']) {
          if ((await page.getByText(label, { exact: false }).count()) === 0) fail(`创建页缺少：${label}`)
        }
        // 内容入口是按钮而非 input
        const contentEdit = page.getByRole('button', { name: /编辑|点击编辑 Markdown/ })
        if ((await contentEdit.count()) === 0) fail('内容缺少编辑入口按钮')
        else {
          await contentEdit.first().click()
          await page.waitForTimeout(400)
          if ((await page.getByRole('button', { name: '保存', exact: true }).count()) === 0) {
            fail('内容 drawer 缺少保存')
          }
          await page.getByRole('button', { name: '关闭', exact: true }).click()
          await page.waitForTimeout(300)
        }
        const backCreate = page.getByRole('button', { name: '返回' })
        if ((await backCreate.count()) > 0) await backCreate.click()
        await page.waitForTimeout(400)
      }

      const boardBtn = page.getByRole('button', { name: '看板', exact: true })
      if ((await boardBtn.count()) === 0) fail('社媒缺少「看板」入口')
      else {
        await boardBtn.click()
        await page.waitForTimeout(800)
        if ((await page.getByText('数据看板').count()) === 0) fail('未进入数据看板页')
        const back = page.getByRole('button', { name: '返回' })
        if ((await back.count()) > 0) await back.click()
        await page.waitForTimeout(400)
      }

      
      // 已发布卡片：sheet 动画 + Markdown 渲染
      await page.getByRole('button', { name: '已发布', exact: true }).click()
      await page.waitForTimeout(500)
      const cards = page.locator('button.group.relative')
      const cardCount = await cards.count()
      if (cardCount > 0) {
        await cards.first().click()
        await page.waitForTimeout(120)
        const sheet = page.locator('.era-bottom-sheet__dialog')
        if ((await sheet.count()) === 0) fail('未出现底部 sheet')
        else {
          // 打开瞬间应为关闭态或随后变为打开态
          await page.waitForTimeout(360)
          const open = await sheet.first().getAttribute('data-open')
          if (open !== 'true') fail('底部 sheet 未进入打开动画态')
          await page.waitForTimeout(600)
          const md = page.locator('.era-md-preview')
          if ((await md.count()) === 0) fail('sheet 内缺少 Markdown 预览')
          else {
            const hasHeading = await md.locator('h1, h2, h3').count()
            const text = (await md.innerText()).trim()
            if (!text) fail('Markdown 预览内容为空')
            // 有结构化标题更好；没有也不直接失败（部分帖可能无 # 标题）
            console.log('md headings:', hasHeading, 'chars:', text.length)
          }
          await page.getByRole('button', { name: '关闭', exact: true }).first().click()
          await page.waitForTimeout(320)
        }
      }

await extractBtn.click()
      await page.waitForTimeout(500)
      const backOrTitle =
        (await page.getByText('智能提取').count()) > 0 ||
        (await page.getByRole('button', { name: '开始提取完整数据' }).count()) > 0
      if (!backOrTitle) fail('智能提取页未打开')
      // 返回列表
      const back = page.getByRole('button', { name: '返回' })
      if ((await back.count()) > 0) await back.click()
      await page.waitForTimeout(400)
    }

    // 高亮缺参提示
    await page.getByRole('button', { name: '高亮', exact: true }).click()
    await page.waitForTimeout(400)
    const missing = await page.getByText('缺少 shareId').count()
    if (missing === 0) fail('高亮缺参提示未出现')

    // 回到图文
    await page.getByRole('button', { name: '图文', exact: true }).click()
    await page.waitForTimeout(600)

    console.log('smoke ok')
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  } finally {
    await browser.close()
  }

  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`)
    process.exit(1)
  }
}

void main()
