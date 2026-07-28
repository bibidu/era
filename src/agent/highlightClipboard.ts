import type { HighlightRange } from './protocol'
import type { HighlightRangeWithText } from './highlightRanges'

/** 剪贴板 / 用户粘贴给 AI 时的识别标记 */
export const ERA_HIGHLIGHT_SETUP_MARKER = 'ERA_HIGHLIGHT_SETUP_V1'

export const ERA_HIGHLIGHT_SETUP_TYPE = 'era_highlight_setup' as const

export interface EraHighlightSetupPayload {
  type: typeof ERA_HIGHLIGHT_SETUP_TYPE
  version: 1
  projectId: string
  ranges: HighlightRangeWithText[]
}

export function buildHighlightSetupPayload(
  projectId: string,
  ranges: HighlightRangeWithText[],
): EraHighlightSetupPayload {
  return {
    type: ERA_HIGHLIGHT_SETUP_TYPE,
    version: 1,
    projectId,
    ranges,
  }
}

/** 生成给用户复制、AI 可直接识别并调用 era_apply_highlights 的文本 */
export function serializeHighlightSetup(payload: EraHighlightSetupPayload): string {
  const json = JSON.stringify(payload, null, 2)
  return [
    ERA_HIGHLIGHT_SETUP_MARKER,
    '请把下面整段发给 AI；AI 应使用 era_apply_highlights（replace: true）写入高亮。',
    '```json',
    json,
    '```',
  ].join('\n')
}

export function parseHighlightSetup(raw: string): EraHighlightSetupPayload | null {
  const text = raw.trim()
  if (!text) return null

  const tryParse = (candidate: string): EraHighlightSetupPayload | null => {
    try {
      const data = JSON.parse(candidate) as Partial<EraHighlightSetupPayload>
      if (data?.type !== ERA_HIGHLIGHT_SETUP_TYPE) return null
      if (data.version !== 1) return null
      if (typeof data.projectId !== 'string' || !data.projectId) return null
      if (!Array.isArray(data.ranges)) return null
      return {
        type: ERA_HIGHLIGHT_SETUP_TYPE,
        version: 1,
        projectId: data.projectId,
        ranges: data.ranges as HighlightRangeWithText[],
      }
    } catch {
      return null
    }
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    const parsed = tryParse(fenced[1].trim())
    if (parsed) return parsed
  }

  const markerIndex = text.indexOf(ERA_HIGHLIGHT_SETUP_MARKER)
  if (markerIndex >= 0) {
    const after = text.slice(markerIndex + ERA_HIGHLIGHT_SETUP_MARKER.length).trim()
    const fencedAfter = after.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fencedAfter?.[1]) {
      const parsed = tryParse(fencedAfter[1].trim())
      if (parsed) return parsed
    }
    const brace = after.indexOf('{')
    if (brace >= 0) {
      const parsed = tryParse(after.slice(brace))
      if (parsed) return parsed
    }
  }

  if (text.startsWith('{')) {
    return tryParse(text)
  }

  return null
}

/** 去掉 text 等扩展字段，得到可直接 POST /highlights 的 ranges */
export function toApplyHighlightRanges(
  ranges: HighlightRangeWithText[],
): HighlightRange[] {
  return ranges.map(({ style, blockId, start, end, color }) => ({
    style,
    blockId,
    start,
    end,
    color,
  }))
}
