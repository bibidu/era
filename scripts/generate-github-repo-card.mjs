#!/usr/bin/env node
/**
 * 为图文 skill 生成开源社区仓库首页预览卡片图。
 * 拉取仓库 Open Graph 社交预览图，裁剪为 Era 内容区宽度，并叠加仓库名与 Star 数。
 *
 * 用法：
 *   node scripts/generate-github-repo-card.mjs --repo hugohe3/ppt-master
 *   node scripts/generate-github-repo-card.mjs --owner hugohe3 --name ppt-master --out output/repo-card.png
 *   node scripts/generate-github-repo-card.mjs --repo hugohe3/ppt-master --dataurl
 */

import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

/** Era 内容区宽度（1080 - 96*2） */
const WIDTH = 888
const HEIGHT = Math.round((WIDTH * 9) / 16)

function parseArgs(argv) {
  const out = {
    owner: '',
    name: '',
    repo: '',
    out: path.join(ROOT, 'output', 'github-repo-card.png'),
    dataurl: false,
    dataurlOut: '',
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    switch (a) {
      case '--repo':
        out.repo = next()
        break
      case '--owner':
        out.owner = next()
        break
      case '--name':
        out.name = next()
        break
      case '--out':
      case '-o':
        out.out = path.resolve(next())
        break
      case '--dataurl':
        out.dataurl = true
        break
      case '--dataurl-out':
        out.dataurlOut = path.resolve(next())
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
      default:
        break
    }
  }

  if (out.repo) {
    const [owner, name] = out.repo.split('/')
    out.owner = owner ?? ''
    out.name = name ?? ''
  }

  return out
}

function printHelp() {
  console.log(`开源社区仓库卡片图生成器（供图文 skill 混排）

用法:
  node scripts/generate-github-repo-card.mjs --repo owner/name [--out path] [--dataurl]
  node scripts/generate-github-repo-card.mjs --owner owner --name repo

选项:
  --repo          仓库全名，如 hugohe3/ppt-master
  --owner --name  也可分开指定
  --out, -o       输出 PNG 路径（默认 output/github-repo-card.png）
  --dataurl       额外输出 dataURL 到 stdout（JSON）
  --dataurl-out   将 { path, dataUrl, width, height, fullName, stars } 写入 JSON 文件
`)
}

function formatStars(count) {
  if (!Number.isFinite(count)) return '0'
  if (count >= 10000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(count)
}

async function fetchRepoMeta(owner, name) {
  const url = `https://api.github.com/repos/${owner}/${name}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'era-github-repo-card',
    },
  })
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${url}`)
  }
  const data = await res.json()
  return {
    fullName: data.full_name ?? `${owner}/${name}`,
    stars: data.stargazers_count ?? 0,
    description: data.description ?? '',
    ogImage: `https://opengraph.githubassets.com/1/${owner}/${name}`,
  }
}

function buildHtml({ ogImage, fullName, stars }) {
  const starLabel = formatStars(stars)
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${WIDTH}px;
      height: ${HEIGHT}px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: #0d1117;
    }
    .card {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(240, 246, 252, 0.1);
    }
    .bg {
      position: absolute;
      inset: 0;
      background: #161b22 center/cover no-repeat;
      background-image: url("${ogImage}");
    }
    .shade {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(13, 17, 23, 0.05) 0%,
        rgba(13, 17, 23, 0.35) 45%,
        rgba(13, 17, 23, 0.88) 100%
      );
    }
    .meta {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 20px 24px 22px;
      color: #f0f6fc;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
    }
    .repo {
      min-width: 0;
      flex: 1;
    }
    .repo-name {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.02em;
      word-break: break-all;
    }
    .repo-owner {
      margin-top: 6px;
      font-size: 14px;
      color: rgba(240, 246, 252, 0.72);
    }
    .stars {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(240, 246, 252, 0.12);
      border: 1px solid rgba(240, 246, 252, 0.16);
      font-size: 22px;
      font-weight: 700;
      white-space: nowrap;
    }
    .stars svg {
      width: 22px;
      height: 22px;
      fill: #f0c14b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="bg"></div>
    <div class="shade"></div>
    <div class="meta">
      <div class="repo">
        <div class="repo-name">${fullName}</div>
        <div class="repo-owner">开源社区仓库</div>
      </div>
      <div class="stars" aria-label="${stars} stars">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>
        <span>${starLabel}</span>
      </div>
    </div>
  </div>
</body>
</html>`
}

async function renderCard(meta) {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 2,
    })
    await page.setContent(buildHtml(meta), { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    return await page.screenshot({ type: 'png' })
  } finally {
    await browser.close()
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.owner || !args.name) {
    printHelp()
    process.exit(1)
  }

  const meta = await fetchRepoMeta(args.owner, args.name)
  const png = await renderCard(meta)

  await mkdir(path.dirname(args.out), { recursive: true })
  await writeFile(args.out, png)

  const dataUrl = `data:image/png;base64,${png.toString('base64')}`
  const result = {
    path: args.out,
    dataUrl,
    width: WIDTH,
    height: HEIGHT,
    fullName: meta.fullName,
    stars: meta.stars,
    markdown: `![${meta.fullName}](${dataUrl} =${WIDTH}x${HEIGHT})`,
  }

  console.log(`已生成: ${args.out} (${WIDTH}×${HEIGHT}, ${meta.fullName}, ★ ${meta.stars})`)

  if (args.dataurlOut) {
    await writeFile(args.dataurlOut, JSON.stringify(result, null, 2), 'utf8')
    console.log(`JSON: ${args.dataurlOut}`)
  }

  if (args.dataurl) {
    console.log(JSON.stringify(result))
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
