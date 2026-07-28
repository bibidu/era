/** 标题调整页：可复制给 Agent 的配置协议 */

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
