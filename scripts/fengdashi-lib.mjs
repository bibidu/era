#!/usr/bin/env node
/**
 * 风大师 skill 公共库：风水号的业务库读写 + 复盘常量。
 * 见 .agents/skills/fengdashi/SKILL.md
 *
 * 通用能力（REST 读写、后台数据解析、档期计算）全部复用蛇大师的 shedashi-lib.mjs，
 * 本文件只覆盖「风水号」与图文号不同的那几个常量与判定，避免两套逻辑漂移。
 */
import {
  WEEKDAYS,
  MAX_PUBLISH_GAP_DAYS,
  WEEKDAY_PRIORITY,
  PLAN_WEEKDAYS,
  isPublishedRecord,
  toUtcDate,
  weekdayOf,
  dayGap,
  addDays,
  planNextSlot,
  restGet,
  restPost,
  restPatch,
  toNumber,
  parseMetrics,
  publishedDate,
} from './shedashi-lib.mjs'

/**
 * 可进入风水复盘的必要条件（两个都要满足，缺一不可）：
 * 类型＝风水 且 数据回收状态＝提取成功。
 * 其余状态（未开始 / 提取中 / 提取失败）不参与任何结论，也不要拿标题去猜它的表现。
 */
export const FENGSHUI_WORK_TYPE = '风水'
export const ANALYSIS_EXTRACT_STATUS = '提取成功'

export function isFengAnalyzable(record) {
  return (
    record?.work_type === FENGSHUI_WORK_TYPE &&
    record?.extract_status === ANALYSIS_EXTRACT_STATUS
  )
}

/**
 * 发布时段分桶：与蛇大师一致。早间推荐池更肥；凌晨（<7 点）单独成桶，
 * 否则会把「早」这个最强变量的中位数拉花（风水号供错财神三篇都发在凌晨 2 点，播放 738→528→171）。
 */
export function slotOf(hour) {
  if (hour == null) return '未知'
  if (hour < 7) return '凌晨 0-6'
  if (hour < 11) return '早 7-10'
  if (hour < 15) return '午 11-14'
  return '下午 15+'
}

/**
 * 分篇连载检测：风水号常把长选题拆成（上篇）/（中篇）/（下篇）。
 * 若最近发布的是非末篇，下一期应接住其篇末预告，别断连载。
 */
export function seriesPartOf(title) {
  const m = String(title || '').match(/（(上|中|下|终)篇）|[((](上|中|下|终)篇[))]/)
  return m ? (m[1] || m[2]) : null
}

export {
  WEEKDAYS,
  MAX_PUBLISH_GAP_DAYS,
  WEEKDAY_PRIORITY,
  PLAN_WEEKDAYS,
  isPublishedRecord,
  toUtcDate,
  weekdayOf,
  dayGap,
  addDays,
  planNextSlot,
  restGet,
  restPost,
  restPatch,
  toNumber,
  parseMetrics,
  publishedDate,
}
