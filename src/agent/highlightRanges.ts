import type { HighlightRange, HighlightStyle } from './protocol'

export type HighlightColorMap = Record<string, string>

export interface HighlightMaps {
  underlineHighlightColors: HighlightColorMap
  brushHighlightColors: HighlightColorMap
  quoteHighlightColors: HighlightColorMap
  circleHighlightColors: HighlightColorMap
}

function mapKeyForStyle(style: HighlightStyle): keyof HighlightMaps {
  switch (style) {
    case 'underline':
      return 'underlineHighlightColors'
    case 'brush':
      return 'brushHighlightColors'
    case 'quote':
      return 'quoteHighlightColors'
    case 'circle':
      return 'circleHighlightColors'
  }
}

export function emptyHighlightMaps(): HighlightMaps {
  return {
    underlineHighlightColors: {},
    brushHighlightColors: {},
    quoteHighlightColors: {},
    circleHighlightColors: {},
  }
}

/**
 * 将 range 列表写入字符级高亮 map。
 * blockId 必须与前端 parseScopedMarkdown 生成的 id 一致。
 */
export function applyHighlightRanges(
  maps: HighlightMaps,
  ranges: HighlightRange[],
): { maps: HighlightMaps; applied: number; errors: string[] } {
  const next: HighlightMaps = {
    underlineHighlightColors: { ...maps.underlineHighlightColors },
    brushHighlightColors: { ...maps.brushHighlightColors },
    quoteHighlightColors: { ...maps.quoteHighlightColors },
    circleHighlightColors: { ...maps.circleHighlightColors },
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
