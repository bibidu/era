export interface TextElement {
  id: string
  content: string
  x: number
  y: number
  fontSize: number
  fontWeight: 400 | 700
  color: string
  fontFamily: string
}

export const FONT_OPTIONS = [
  { id: 'system', label: '默认', value: 'system-ui, sans-serif' },
  { id: 'noto', label: '思源黑体', value: '"Noto Sans SC", sans-serif' },
  { id: 'song', label: '宋体', value: 'SimSun, "Songti SC", serif' },
  { id: 'kai', label: '楷体', value: 'KaiTi, "Kaiti SC", serif' },
] as const

export const COLOR_PRESETS = [
  '#000000',
  '#ffffff',
  '#333333',
  '#666666',
  '#999999',
  '#e53935',
  '#1e88e5',
  '#43a047',
] as const
