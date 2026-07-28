import type { HighlightRange, HighlightStyle } from './protocol'

export type HighlightColorMap = Record<string, string>

export interface HighlightMaps {
  underlineHighlightColors: HighlightColorMap
  handUnderlineHighlightColors: HighlightColorMap
  brushHighlightColors: HighlightColorMap
  quoteHighlightColors: HighlightColorMap
  circleHighlightColors: HighlightColorMap
  colorHighlightColors: HighlightColorMap
}

export type HighlightRangeWithText = HighlightRange & { text?: string }

const HIGHLIGHT_STYLE_ORDER: HighlightStyle[] = [
  'underline',
  'handUnderline',
  'brush',
  'quote',
  'circle',
  'color',
]

function mapKeyForStyle(style: HighlightStyle): keyof HighlightMaps {
  switch (style) {
    case 'underline':
      return 'underlineHighlightColors'
    case 'handUnderline':
      return 'handUnderlineHighlightColors'
    case 'brush':
      return 'brushHighlightColors'
    case 'quote':
      return 'quoteHighlightColors'
    case 'circle':
      return 'circleHighlightColors'
    case 'color':
      return 'colorHighlightColors'
  }
}

export function emptyHighlightMaps(): HighlightMaps {
  return {
    underlineHighlightColors: {},
    handUnderlineHighlightColors: {},
    brushHighlightColors: {},
    quoteHighlightColors: {},
    circleHighlightColors: {},
    colorHighlightColors: {},
  }
}

/** 解析 `${blockId}:${charIndex}`；blockId 本身可含 `:`（如 `uuid::0::title`） */
export function parseHighlightMapKey(
  key: string,
): { blockId: string; index: number } | null {
  const lastColon = key.lastIndexOf(':')
  if (lastColon <= 0) return null
  const index = Number(key.slice(lastColon + 1))
  if (!Number.isInteger(index) || index < 0) return null
  return { blockId: key.slice(0, lastColon), index }
}

/**
 * 将字符级高亮 map 合并为连续 range（同 block、同色、相邻下标）。
 * plainTextByBlockId 可选，用于附带 text 字段方便 AI / 人工核对。
 */
export function highlightMapsToRanges(
  maps: HighlightMaps,
  plainTextByBlockId?: Record<string, string>,
): HighlightRangeWithText[] {
  const ranges: HighlightRangeWithText[] = []

  for (const style of HIGHLIGHT_STYLE_ORDER) {
    const map = maps[mapKeyForStyle(style)]
    const byBlock = new Map<string, Array<{ index: number; color: string }>>()

    for (const [key, color] of Object.entries(map)) {
      if (!color) continue
      const parsed = parseHighlightMapKey(key)
      if (!parsed) continue
      const list = byBlock.get(parsed.blockId) ?? []
      list.push({ index: parsed.index, color })
      byBlock.set(parsed.blockId, list)
    }

    for (const [blockId, entries] of byBlock) {
      entries.sort((a, b) => a.index - b.index)
      let runStart = -1
      let runEnd = -1
      let runColor = ''

      const flush = () => {
        if (runStart < 0 || !runColor) return
        const plain = plainTextByBlockId?.[blockId]
        const text =
          typeof plain === 'string' ? plain.slice(runStart, runEnd) : undefined
        ranges.push({
          style,
          blockId,
          start: runStart,
          end: runEnd,
          color: runColor,
          ...(text !== undefined ? { text } : {}),
        })
        runStart = -1
        runEnd = -1
        runColor = ''
      }

      for (const entry of entries) {
        if (
          runStart >= 0 &&
          entry.index === runEnd &&
          entry.color === runColor
        ) {
          runEnd = entry.index + 1
          continue
        }
        flush()
        runStart = entry.index
        runEnd = entry.index + 1
        runColor = entry.color
      }
      flush()
    }
  }

  return ranges
}

/**
 * 将 range 列表写入字符级高亮 map。
 * blockId 必须与前端 parseScopedMarkdown 生成的 id 一致。
 * replace=true 时先清空全部样式 map 再写入。
 */
export function applyHighlightRanges(
  maps: HighlightMaps,
  ranges: HighlightRange[],
  options?: { replace?: boolean },
): { maps: HighlightMaps; applied: number; errors: string[] } {
  const next: HighlightMaps = options?.replace
    ? emptyHighlightMaps()
    : {
        underlineHighlightColors: { ...maps.underlineHighlightColors },
        handUnderlineHighlightColors: { ...maps.handUnderlineHighlightColors },
        brushHighlightColors: { ...maps.brushHighlightColors },
        quoteHighlightColors: { ...maps.quoteHighlightColors },
        circleHighlightColors: { ...maps.circleHighlightColors },
        colorHighlightColors: { ...maps.colorHighlightColors },
      }
  const errors: string[] = []
  let applied = 0

  for (const range of ranges) {
    if (!range.blockId) {
      errors.push('缺少 blockId')
      continue
    }
    if (!Number.isFinite(range.start) || !Number.isFinite(range.end) || range.end <= range.start) {
      errors.push(`无效 range: ${range.blockId} [${range.start}, ${range.end})`)
      continue
    }
    if (!range.color) {
      errors.push(`缺少 color: ${range.blockId}`)
      continue
    }
    const key = mapKeyForStyle(range.style)
    const target = next[key]
    for (let index = range.start; index < range.end; index += 1) {
      target[`${range.blockId}:${index}`] = range.color
      applied += 1
    }
  }

  return { maps: next, applied, errors }
}
