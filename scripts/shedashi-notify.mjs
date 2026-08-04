#!/usr/bin/env node
/**
 * 蛇大师 skill：飞书机器人推送「下一篇已就绪」。
 * 见 .agents/skills/shedashi/SKILL.md
 *
 * 作为库：import { notifyFeishu } from './shedashi-notify.mjs'
 * 作为命令：node scripts/shedashi-notify.mjs --issue 16 --title "…" --planned-for "2026-08-05 07:40"
 */

const WEBHOOK =
  process.env.SHEDASHI_FEISHU_WEBHOOK ||
  'https://open.feishu.cn/open-apis/bot/v2/hook/9d5b39de-b8a0-446d-b33e-3cd8d8ad3fc8'

/** 交付链必须 HTTPS：Safari「保存到相册」依赖 Web Share，仅安全上下文可用 */
const PREVIEW_URL = 'https://39.106.179.17.sslip.io/?tab=data'

export async function notifyFeishu({
  issue,
  title,
  plannedFor,
  topics,
  pageCount,
  recordId,
  highlights = [],
}) {
  const lines = [
    `**第 ${issue} 期已就绪**`,
    '',
    `**标题**：${title}`,
    plannedFor ? `**建议发布**：${plannedFor}（数据最优档期）` : null,
    pageCount ? `**图片**：${pageCount} 张（第 1 张为封面）` : null,
    topics ? `**话题**：${topics}` : null,
    ...(highlights.length ? ['', '**本期依据**：', ...highlights.map((h) => `- ${h}`)] : []),
    '',
    `到社媒 Tab 自取图片与文案：${PREVIEW_URL}`,
    recordId ? `记录 ID：${recordId}` : null,
  ].filter((line) => line !== null)

  const payload = {
    msg_type: 'interactive',
    card: {
      config: { wide_screen_mode: true },
      header: {
        template: 'turquoise',
        title: { tag: 'plain_text', content: `AI提效实验室 · 第 ${issue} 期已就绪` },
      },
      elements: [
        { tag: 'div', text: { tag: 'lark_md', content: lines.join('\n') } },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '打开社媒库自取' },
              url: PREVIEW_URL,
              type: 'primary',
            },
          ],
        },
      ],
    },
  }

  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (body.code !== 0 && body.StatusCode !== 0) {
    throw new Error(`飞书推送失败: ${JSON.stringify(body).slice(0, 300)}`)
  }
  return true
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`
if (isDirectRun) {
  const arg = (name, fallback = null) => {
    const i = process.argv.indexOf(name)
    return i < 0 ? fallback : (process.argv[i + 1] ?? fallback)
  }
  await notifyFeishu({
    issue: arg('--issue', '?'),
    title: arg('--title', ''),
    plannedFor: arg('--planned-for'),
    topics: arg('--topics'),
    pageCount: Number(arg('--pages', 0)) || undefined,
    recordId: arg('--record-id'),
  })
  console.log(JSON.stringify({ ok: true }))
}
