#!/usr/bin/env node
/**
 * 为 hugohe3/ppt-master 重新生成图文预览（非风水 B 流程简化版）
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const AGENT = 'http://127.0.0.1:3847'
const OUT = path.join(ROOT, 'output', 'ppt-master-tuwen')

async function api(method, url, body) {
  const res = await fetch(`${AGENT}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`${method} ${url} ${res.status}: ${text.slice(0, 300)}`)
  }
  if (!res.ok) throw new Error(`${method} ${url} ${res.status}: ${json.error ?? text}`)
  return json
}

function countChars(text) {
  return [...text.replace(/\s+/g, '')].length
}

async function main() {
  const card = JSON.parse(await readFile(path.join(ROOT, 'output/ppt-master-repo-card.json'), 'utf8'))

  const bodyText = `## 仓库信息

本文介绍的仓库为 **hugohe3/ppt-master**（作者 Hugo He / 仓库名 ppt-master）。

下方卡片展示该仓库在开源社区的预览图与当前 Star 数。

${card.markdown}

## 它解决什么问题

做 PPT 最烦的不是「写不出来」。

而是 AI 给你一堆截图式页面——看着像，改不了。

改一个字要重新生成，图表动不了，动画更是奢望。

PPT Master 走另一条路：让 Agent 按 Skill 工作流，直接生成**可编辑的原生 PowerPoint**。

形状、图表、过渡动画都在 PPT 里，而不是一张扁平长图。

你拿到的是标准 .pptx，能在 PowerPoint / Keynote 里继续改母版、调数据、加备注。

README 强调：**可编辑只是及格线，真正拉开差距的是原生深度**。

母版、原生形状、数据驱动的图表与表格，不是文本框堆叠，也不是套模板填空。

## 三个值得关注的能力

- **原生深度**：幻灯片母版、数据图表、过渡动画；支持按你的模板出稿，点开元素仍是原生对象
- **本地生成**：除与 AI 对话外，流程在你电脑上跑，不绑平台、不锁模型，数据不出本机
- **Agent 工作流**：PDF、网页或主题丢进去，按步骤出完整 .pptx，可继续手工精修

## 形态与三个承诺

形态上，它是在 Agent 工具里跑的一套工作流：对话里说「用这份 PDF 做 PPT」，本机生成并导出 .pptx。

- **成本透明**：工具免费开源，主要成本是模型用量，无额外 PPT 订阅
- **数据不出本地**：材料与生成过程留在你的电脑
- **不锁定平台**：Claude、GPT、Gemini、Kimi 等都可驱动

## 适合谁

需要把长文档快速变成能继续打磨的演示稿的人——产品路演、运营复盘、研究汇报、内部培训都合适。

社区 Star 数已经说明认可度：这不是玩具 Demo，而是能进真实工作流的开源 Skill。

若你也在用 Claude Code / Codex 做自动化，值得把 ppt-master 加进工具箱。

让「写材料」和「做幻灯片」真正串成一条链路。

一句话总结：**要的是能改的 PPT，不是能看的图片。**`

  const charCount = countChars(bodyText.replace(/!\[[^\]]*\]\([^)]+\)/g, ''))
  console.log(`正文字数（不含图片行）: ${charCount}`)

  const project = await api('POST', '/v1/projects', {
    config: {
      pageOverlay: 'pixel',
      aspectRatio: '9:16',
      headingFontId: 'shuheiti',
      headingFontFamily: '"Alimama ShuHeiTi", sans-serif',
      showWordCount: true,
    },
    meta: { topic: 'ppt-master' },
  })
  const projectId = project.projectId ?? project.id
  console.log('projectId:', projectId)

  const mdResult = await api('PUT', `/v1/projects/${projectId}/markdown`, { markdown: bodyText })
  const scopedBlocks = mdResult.blocks ?? []

  const preview1 = await api('POST', `/v1/projects/${projectId}/preview-layout`, {})
  console.log('layout issues:', preview1.issues?.length ?? 0, preview1.issues?.map((i) => i.code).join(', '))

  const ranges = []

  function findScoped(substr) {
    return scopedBlocks.find((b) => b.plainText?.includes(substr) || b.text?.includes(substr))
  }

  function addBrush(block, phrase, color = '#FACC15') {
    if (!block) return
    const plain = block.plainText ?? block.text
    const idx = plain.indexOf(phrase)
    if (idx < 0) return
    ranges.push({ style: 'brush', blockId: block.id, start: idx, end: idx + phrase.length, color })
  }

  function addUnderline(block, phrase, color = '#EF4444') {
    if (!block) return
    const plain = block.plainText ?? block.text
    const idx = plain.indexOf(phrase)
    if (idx < 0) return
    ranges.push({ style: 'underline', blockId: block.id, start: idx, end: idx + phrase.length, color })
  }

  addBrush(findScoped('可编辑的原生 PowerPoint'), '可编辑的原生 PowerPoint')
  addBrush(findScoped('原生深度'), '原生深度')
  addUnderline(findScoped('不是一张扁平长图'), '不是一张扁平长图')
  addBrush(findScoped('本地生成'), '本地生成')
  addBrush(findScoped('Agent 工作流'), 'Agent 工作流')
  addBrush(findScoped('数据不出本地'), '数据不出本地')
  addBrush(findScoped('不锁定平台'), '不锁定平台')
  addUnderline(findScoped('能进真实工作流'), '能进真实工作流')
  addUnderline(findScoped('继续改母版'), '继续改母版')
  addUnderline(findScoped('加进工具箱'), '加进工具箱')
  addBrush(findScoped('能改的 PPT'), '能改的 PPT')

  await api('POST', `/v1/projects/${projectId}/highlights`, { ranges, replace: true })

  const preview2 = await api('POST', `/v1/projects/${projectId}/preview-layout`, {})
  console.log('after highlight issues:', preview2.issues?.length ?? 0)

  await mkdir(OUT, { recursive: true })
  const exported = await api('POST', `/v1/projects/${projectId}/export`, { outDir: OUT })
  console.log('exported:', exported)

  // 封面
  const coverPath = path.join(OUT, 'cover.png')
  execSync(
    `node scripts/generate-cover.mjs --bigTitle "PPT\\nMASTER" --smallTitle "AI 生成可编辑 PPT" --description "开源 Skill：文档变原生 PowerPoint" --tags "Agent,开源,可编辑,.pptx" --secondaryTitles "原生图表,本地生成,Skill工作流" --themeColor "#1D4ED8" --out "${coverPath}"`,
    { cwd: ROOT, stdio: 'inherit' },
  )

  // 横版拼图：封面 + 各页
  const pagePaths = (exported.paths ?? []).sort()
  const sheetPath = path.join(OUT, 'ppt-master-review-sheet.png')
  await stitchHorizontal([coverPath, ...pagePaths], sheetPath)
  console.log('review sheet:', sheetPath)

  await writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ projectId, charCount, coverPath, sheetPath, pagePaths, exported }, null, 2),
  )

  const share = await api('POST', `/v1/projects/${projectId}/export-share`, {})
  console.log('gallery preview:', share.url)
}

async function stitchHorizontal(imagePaths, outPath) {
  const { chromium } = await import('playwright')
  const imgs = await Promise.all(
    imagePaths.map(async (p) => {
      const buf = await readFile(p)
      const b64 = buf.toString('base64')
      return `data:image/png;base64,${b64}`
    }),
  )
  const html = `<!DOCTYPE html><html><head><style>
    body{margin:0;background:#111;display:flex;align-items:flex-start}
    img{height:1920px;width:auto;display:block}
  </style></head><body>${imgs.map((s) => `<img src="${s}" />`).join('')}</body></html>`
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const width = await page.evaluate(() =>
      Array.from(document.images).reduce((sum, img) => sum + img.naturalWidth, 0),
    )
    await page.setViewportSize({ width, height: 1920 })
    await page.screenshot({ path: outPath, fullPage: false })
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
