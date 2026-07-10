export type TextAlign = 'none' | 'left' | 'center' | 'right'

export interface TextElement {
  id: string
  content: string
  x: number
  y: number
  fontSize: number
  fontWeight: 400 | 700
  color: string
  fontFamily: string
  fontId: string
  textAlign: TextAlign
}

export type FontSource = 'system' | 'google'

export interface FontOption {
  id: string
  label: string
  fontFamily: string
  sample: string
  source: FontSource
  googleFamily?: string
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'system',
    label: '默认',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    sample: '默认字体 Aa',
    source: 'system',
  },
  {
    id: 'noto',
    label: '思源黑体',
    fontFamily: '"Noto Sans SC", sans-serif',
    sample: '思源黑体 Aa',
    source: 'google',
    googleFamily: 'Noto+Sans+SC:wght@400;700',
  },
  {
    id: 'zcool',
    label: '站酷文艺体',
    fontFamily: '"ZCOOL XiaoWei", serif',
    sample: '站酷文艺体 Aa',
    source: 'google',
    googleFamily: 'ZCOOL+XiaoWei',
  },
  {
    id: 'ma-shan',
    label: '马善政楷书',
    fontFamily: '"Ma Shan Zheng", cursive',
    sample: '马善政楷书 Aa',
    source: 'google',
    googleFamily: 'Ma+Shan+Zheng',
  },
  {
    id: 'song',
    label: '宋体',
    fontFamily: 'SimSun, "Songti SC", serif',
    sample: '宋体 Aa',
    source: 'system',
  },
  {
    id: 'kai',
    label: '楷体',
    fontFamily: 'KaiTi, "Kaiti SC", serif',
    sample: '楷体 Aa',
    source: 'system',
  },
]

export const COLOR_PALETTE = [
  '#000000', '#ffffff', '#f2f2f2', '#bdbdbd', '#757575',
  '#e53935', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
  '#ff5722', '#795548', '#607d8b', '#f44336', '#1565c0',
] as const

export const ALIGN_OPTIONS: { id: TextAlign; label: string }[] = [
  { id: 'none', label: '无' },
  { id: 'left', label: '左' },
  { id: 'center', label: '中' },
  { id: 'right', label: '右' },
]

export const H_PADDING = 16
