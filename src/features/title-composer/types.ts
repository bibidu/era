/** 标题排版草稿：按「行」组织，行内可逐字上色 */

export type TitleTool = 'break' | 'size' | 'stretch' | 'gap' | 'font' | 'color'

export interface TitleChar {
  id: string
  ch: string
  /** 行内强调色；缺省用行色 */
  color?: string
}

export interface TitleLine {
  id: string
  chars: TitleChar[]
  fontSize: number
  /** 水平拉伸 scaleX，1 = 正常 */
  stretch: number
  fontId: string
  color: string
  /** 与下一行的间距（px，相对设计稿） */
  gapAfter: number
}

export interface TitleDocument {
  lines: TitleLine[]
}

export const TITLE_ACCENT = '#E11D48'
export const TITLE_INK = '#111111'

export const FONT_SIZE_OPTIONS = [
  28, 32, 36, 40, 44, 48, 52, 56, 64, 72, 80, 88, 96, 108, 120,
] as const

export const STRETCH_OPTIONS = [
  0.7, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.5, 1.6, 1.8,
] as const

export const GAP_OPTIONS = [0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64] as const

export const COLOR_PRESETS = [
  { id: 'ink', label: '墨', value: TITLE_INK },
  { id: 'red', label: '红', value: TITLE_ACCENT },
  { id: 'blue', label: '蓝', value: '#1D4ED8' },
  { id: 'orange', label: '橙', value: '#C2410C' },
] as const
