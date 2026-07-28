/** 标题调整页：可复制给 Agent 的配置协议 */

import { encodeGlyphEmphasis } from '../graphic-text/glyphEmphasis'

export const TITLE_ADJUST_CLIPBOARD_TYPE = 'era_title_adjust' as const
export const TITLE_ADJUST_CLIPBOARD_VERSION = 1 as const

export interface TitleAdjustCharConfig {
  ch: string
  fontId: string
  fontFamily: string
  /** 字号（px，相对预览基准宽度） */
  fontSize: number
  scaleX: number
  scaleY: number
  /** 占位宽度（em，相对该字 fontSize） */
  widthEm: number
  color: string
}

export interface TitleAdjustLineConfig {
  chars: TitleAdjustCharConfig[]
}

export interface TitleAdjustConfig {
  type: typeof TITLE_ADJUST_CLIPBOARD_TYPE
  version: typeof TITLE_ADJUST_CLIPBOARD_VERSION
  /** 行与行之间的间距（em，相对该行最大字号） */
  lineGapEm: number
  /** 预览画布逻辑宽度 */
  baseWidth: number
  lines: TitleAdjustLineConfig[]
}

export const DEFAULT_CHAR = {
  fontId: 'song',
  fontFamily: '"Noto Serif SC", serif',
  fontSize: 56,
  scaleX: 1,
  scaleY: 1,
  widthEm: 1,
  color: '#111111',
} as const

export function parseTitleToLines(raw: string): string[] {
  const text = raw.replace(/\r\n/g, '\n').trim()
  if (!text) return ['']
  if (text.includes('|') && !text.includes('\n')) {
    return text
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function buildLinesFromText(
  raw: string,
  template?: Partial<TitleAdjustCharConfig>,
): TitleAdjustLineConfig[] {
  const base = { ...DEFAULT_CHAR, ...template }
  return parseTitleToLines(raw).map((line) => ({
    chars: [...line].map((ch) => ({ ch, ...base })),
  }))
}

export function formatTitleAdjustClipboard(config: TitleAdjustConfig): string {
  const json = JSON.stringify(config, null, 2)
  return [
    'ERA_TITLE_ADJUST_V1',
    '请把下面整段发给 AI；AI 应按此配置渲染标题（字体 / 字号 / scaleX/Y / 占位宽 / 颜色 / 行距）。',
    '',
    json,
  ].join('\n')
}

export function tryParseTitleAdjustClipboard(text: string): TitleAdjustConfig | null {
  const raw = text.trim()
  if (!raw) return null
  const jsonStart = raw.indexOf('{')
  if (jsonStart < 0) return null
  try {
    const parsed = JSON.parse(raw.slice(jsonStart)) as TitleAdjustConfig
    if (parsed?.type !== TITLE_ADJUST_CLIPBOARD_TYPE) return null
    if (!Array.isArray(parsed.lines)) return null
    return parsed
  } catch {
    return null
  }
}

/** 把标题调整配置落到 Era 工程：标题文本 + glyphEmphasis + 文字色 + 行距 */
export function titleAdjustToGraphicPatch(
  config: TitleAdjustConfig,
  titleBlockId: string,
): {
  title: string
  glyphEmphasis: Record<string, string>
  colorHighlightColors: Record<string, string>
  titleLineGapEm: number
} {
  const glyphEmphasis: Record<string, string> = {}
  const colorHighlightColors: Record<string, string> = {}
  let index = 0
  const titleLines: string[] = []

  for (const line of config.lines) {
    titleLines.push(line.chars.map((c) => c.ch).join(''))
    for (const char of line.chars) {
      const key = `${titleBlockId}:${index}`
      glyphEmphasis[key] = encodeGlyphEmphasis({
        fontFamily: char.fontFamily,
        scaleX: char.scaleX,
        scaleY: char.scaleY,
        fontSize: char.fontSize,
        widthEm: char.widthEm,
        color: char.color,
      })
      if (char.color && char.color.toLowerCase() !== '#111111') {
        colorHighlightColors[key] = char.color
      }
      index += 1
    }
  }

  return {
    title: titleLines.join('|'),
    glyphEmphasis,
    colorHighlightColors,
    titleLineGapEm: config.lineGapEm,
  }
}
