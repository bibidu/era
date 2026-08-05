#!/usr/bin/env node
/**
 * 蛇大师 skill 最后一步：把出好的封面 + 内容页上传 OSS、写入业务库、推飞书。
 * 见 .agents/skills/shedashi/SKILL.md
 *
 * 用法:
 *   node scripts/shedashi-publish.mjs --input output/shedashi/ep16/publish.json
 *
 * publish.json 结构：
 * {
 *   "title": "社媒标题（各行连写）",
 *   "issue": 16,
 *   "outline": "一句话大纲",
 *   "markdown": "用户可见正文（禁止含 era:page-break）",
 *   "topics": "#cursor #agent",
 *   "plannedFor": "2026-08-05 07:40",
 *   "cover": "output/.../cover.png",
 *   "pages": ["output/.../graphic-page-01.png", "..."]
 * }
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { restPost } from './shedashi-lib.mjs'
import { notifyFeishu, notifyFeishuAlert } from './shedashi-notify.mjs'

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name)
  if (i < 0) return fallback
  return process.argv[i + 1] ?? fallback
}

const inputPath = arg('--input')
if (!inputPath) {
  console.error('需要 --input <publish.json>')
  process.exit(1)
}

const plan = JSON.parse(readFileSync(inputPath, 'utf8'))

/** 任何一步失败都要让用户在飞书上看到，而不是只留在 Agent 日志里 */
let currentStage = '读取 publish.json'
process.on('unhandledRejection', (error) => {
  throw error
})
async function failLoudly(error) {
  const detail = error instanceof Error ? `${error.message}` : String(error)
  try {
    await notifyFeishuAlert({
      stage: currentStage,
      detail,
      action: '看下这一步的报错，告诉我怎么处理；修好后我会重跑并重新通知你',
      issue: plan.issue,
    })
  } catch (notifyError) {
    console.error('飞书告警也失败了：', notifyError)
  }
  console.error(error)
  process.exit(1)
}
/** 封面与内容页都用 --cover：预览首图与各页需长期可访问，不能被 14h 清理掉 */
function uploadCover(file) {
  const stdout = execFileSync('bash', ['scripts/oss-upload.sh', '--cover', file], {
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  })
  const url = stdout.match(/https?:\/\/\S+?\.(?:png|jpe?g)/i)?.[0]
  if (!url) throw new Error(`未能从上传输出解析 URL:\n${stdout.slice(-800)}`)
  return url
}

async function main() {
  currentStage = '校验 publish.json'
  for (const field of ['title', 'issue', 'markdown', 'cover', 'pages']) {
    if (!plan[field]) throw new Error(`publish.json 缺少字段: ${field}`)
  }
  if (/era:page-break/.test(plan.markdown)) {
    throw new Error('markdown 含 era:page-break，用户可见正文必须先去掉')
  }

  const files = [plan.cover, ...plan.pages].map((p) => resolve(p))
  for (const file of files) {
    if (!existsSync(file)) throw new Error(`文件不存在: ${file}`)
  }

  const urls = []
  for (const [index, file] of files.entries()) {
    currentStage = `上传 OSS（${index + 1}/${files.length}）`
    process.stderr.write(`上传 ${index + 1}/${files.length} ${file}\n`)
    urls.push(uploadCover(file))
  }

  const [coverUrl, ...pageUrls] = urls

  currentStage = '写入业务库'
  const record = (
    await restPost('era_social_video_analyses', {
      title: plan.title,
      // published_at 留给用户实际发布时间；此处记录计划档期，便于复盘对齐
      published_at: plan.plannedFor || new Date().toISOString(),
      cover_url: coverUrl,
      markdown: plan.markdown,
      // 期号写进 outline 前缀，供下次 shedashi-analyze.mjs 自动续期
      outline: `第${plan.issue}期 | ${plan.outline || ''}`.trim(),
      image_previews: [coverUrl, ...pageUrls],
      extract_images: [],
      extract_data: '',
      extract_status: '未开始',
      temp_govern_status: '未治理',
      work_type: '图文',
    })
  )?.[0]

  if (!record?.id) throw new Error('入库失败：业务库未返回记录 id')

  currentStage = '飞书通知'
  const notified = await notifyFeishu({
    issue: plan.issue,
    title: plan.title,
    plannedFor: plan.plannedFor,
    topics: plan.topics,
    pageCount: files.length,
    recordId: record.id,
    highlights: plan.highlights,
    cadence: plan.cadence,
  })

  console.log(
    JSON.stringify({ ok: true, recordId: record.id, coverUrl, pageUrls, notified }, null, 2),
  )
}

await main().catch(failLoudly)
