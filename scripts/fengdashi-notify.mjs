#!/usr/bin/env node
/**
 * 风大师 skill：飞书机器人推送「下一篇已就绪」/「需要你确认」。
 * 见 .agents/skills/fengdashi/SKILL.md
 *
 * 与蛇大师推到**同一个飞书群**（同一 webhook）；只是卡片抬头标成风水号，便于区分。
 *
 * 作为库：import { notifyFeishu, notifyFeishuAlert } from './fengdashi-notify.mjs'
 * 作为命令：node scripts/fengdashi-notify.mjs --title "…" --planned-for "2026-08-12 07:40"
 */

/** 同一个飞书群：默认沿用蛇大师的 webhook；两个 env 名都认，保证落到同一群 */
const WEBHOOK =
  process.env.FENGDASHI_FEISHU_WEBHOOK ||
  process.env.SHEDASHI_FEISHU_WEBHOOK ||
  'https://open.feishu.cn/open-apis/bot/v2/hook/9d5b39de-b8a0-446d-b33e-3cd8d8ad3fc8'

/** 交付链必须 HTTPS：Safari「保存到相册」依赖 Web Share，仅安全上下文可用 */
const PREVIEW_URL = 'https://39.106.179.17.sslip.io/?tab=data'

export async function notifyFeishu({
  title,
  plannedFor,
  topics,
  pageCount,
  recordId,
  highlights = [],
  cadence,
}) {
  const lines = [
    '**风水号下一篇已就绪**',
    '',
    `**标题**：${title}`,
    plannedFor ? `**建议发布**：${plannedFor}（数据最优档期）` : null,
    // 抖音断更惩罚：上一次发布后最晚第 3 天必须再发，发布的人是用户，红线必须写给用户看
    cadence?.nextDeadline
      ? `**断更红线**：发完这篇后，下一篇最晚 ${cadence.nextDeadline} 发（间隔不得超过 2 天）`
      : null,
    cadence?.overdue ? '**注意**：距上次发布已超过 2 天，已进入断更区间，尽快发' : null,
    pageCount ? `**图片**：${pageCount} 张（第 1 张为封面/首页）` : null,
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
        template: 'wathet',
        title: { tag: 'plain_text', content: '风大师 · 风水号阳宅篇 · 下一篇已就绪' },
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

/**
 * 异常告警：凡是风大师自己修不好、或需要用户拍板的情况，都必须推这张卡。
 * 只在对话里写一句「失败了」是不够的——用户可能根本没在看对话。
 */
export async function notifyFeishuAlert({ stage, detail, action }) {
  const lines = [
    `**卡在这一步**：${stage}`,
    '',
    '**现象**：',
    '```',
    String(detail ?? '').trim().slice(0, 1200) || '（无详情）',
    '```',
    '',
    action ? `**需要你做**：${action}` : '**需要你做**：确认后回复我怎么处理',
  ].filter((line) => line !== null)

  const payload = {
    msg_type: 'interactive',
    card: {
      config: { wide_screen_mode: true },
      header: {
        template: 'red',
        title: { tag: 'plain_text', content: '风大师需要你确认 · 风水号任务未完成' },
      },
      elements: [{ tag: 'div', text: { tag: 'lark_md', content: lines.join('\n') } }],
    },
  }

  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (body.code !== 0 && body.StatusCode !== 0) {
    throw new Error(`飞书告警推送失败: ${JSON.stringify(body).slice(0, 300)}`)
  }
  return true
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`
if (isDirectRun) {
  const arg = (name, fallback = null) => {
    const i = process.argv.indexOf(name)
    return i < 0 ? fallback : (process.argv[i + 1] ?? fallback)
  }
  if (process.argv.includes('--alert')) {
    await notifyFeishuAlert({
      stage: arg('--stage', '未知步骤'),
      detail: arg('--detail', ''),
      action: arg('--action'),
    })
  } else {
    await notifyFeishu({
      title: arg('--title', ''),
      plannedFor: arg('--planned-for'),
      topics: arg('--topics'),
      pageCount: Number(arg('--pages', 0)) || undefined,
      recordId: arg('--record-id'),
    })
  }
  console.log(JSON.stringify({ ok: true }))
}
