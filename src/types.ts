export type TextAlign = 'none' | 'left' | 'center' | 'right'
export type TextDecoration = 'none' | 'underline' | 'line-through'

export interface TextElement {
  id: string
  content: string
  x: number
  y: number
  fontSize: number
  fontWeight: 400 | 700
  fontStyle: 'normal' | 'italic'
  textDecoration: TextDecoration
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
  { id: 'system', label: '默认', fontFamily: 'system-ui, -apple-system, sans-serif', sample: '默认字体 Aa', source: 'system' },
  { id: 'noto', label: '思源黑体', fontFamily: '"Noto Sans SC", sans-serif', sample: '思源黑体 Aa', source: 'google', googleFamily: 'Noto+Sans+SC:wght@400;700' },
  { id: 'noto-serif', label: '思源宋体', fontFamily: '"Noto Serif SC", serif', sample: '思源宋体 Aa', source: 'google', googleFamily: 'Noto+Serif+SC:wght@400;700' },
  { id: 'roboto', label: 'Roboto', fontFamily: 'Roboto, sans-serif', sample: 'Roboto Aa', source: 'google', googleFamily: 'Roboto:wght@400;700' },
  { id: 'open-sans', label: 'Open Sans', fontFamily: '"Open Sans", sans-serif', sample: 'Open Sans Aa', source: 'google', googleFamily: 'Open+Sans:wght@400;700' },
  { id: 'lato', label: 'Lato', fontFamily: 'Lato, sans-serif', sample: 'Lato Aa', source: 'google', googleFamily: 'Lato:wght@400;700' },
  { id: 'zcool', label: '站酷文艺体', fontFamily: '"ZCOOL XiaoWei", serif', sample: '站酷文艺体 Aa', source: 'google', googleFamily: 'ZCOOL+XiaoWei' },
  { id: 'zcool-kuaile', label: '站酷快乐体', fontFamily: '"ZCOOL KuaiLe", cursive', sample: '站酷快乐体 Aa', source: 'google', googleFamily: 'ZCOOL+KuaiLe' },
  { id: 'zcool-qingke', label: '站酷庆科黄油', fontFamily: '"ZCOOL QingKe HuangYou", cursive', sample: '站酷庆科 Aa', source: 'google', googleFamily: 'ZCOOL+QingKe+HuangYou' },
  { id: 'ma-shan', label: '马善政楷书', fontFamily: '"Ma Shan Zheng", cursive', sample: '马善政楷书 Aa', source: 'google', googleFamily: 'Ma+Shan+Zheng' },
  { id: 'long-cang', label: '龙苍体', fontFamily: '"Long Cang", cursive', sample: '龙苍体 Aa', source: 'google', googleFamily: 'Long+Cang' },
  { id: 'liu-jian', label: '刘建毛草', fontFamily: '"Liu Jian Mao Cao", cursive', sample: '刘建毛草 Aa', source: 'google', googleFamily: 'Liu+Jian+Mao+Cao' },
  { id: 'song', label: '宋体', fontFamily: 'SimSun, "Songti SC", serif', sample: '宋体 Aa', source: 'system' },
  { id: 'kai', label: '楷体', fontFamily: 'KaiTi, "Kaiti SC", serif', sample: '楷体 Aa', source: 'system' },
  { id: 'mono', label: '系统等宽', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', sample: '系统等宽 01', source: 'system' },
  { id: 'courier', label: 'Courier', fontFamily: '"Courier New", Courier, monospace', sample: 'Courier 01', source: 'system' },
  { id: 'jetbrains', label: 'JetBrains Mono', fontFamily: '"JetBrains Mono", monospace', sample: 'JetBrains 01', source: 'google', googleFamily: 'JetBrains+Mono:wght@400;700' },
  { id: 'roboto-mono', label: 'Roboto Mono', fontFamily: '"Roboto Mono", monospace', sample: 'Roboto Mono 01', source: 'google', googleFamily: 'Roboto+Mono:wght@400;700' },
  { id: 'source-code', label: 'Source Code Pro', fontFamily: '"Source Code Pro", monospace', sample: 'Source Code 01', source: 'google', googleFamily: 'Source+Code+Pro:wght@400;700' },
  { id: 'noto-mono', label: 'Noto Sans Mono', fontFamily: '"Noto Sans Mono", monospace', sample: 'Noto Mono 01', source: 'google', googleFamily: 'Noto+Sans+Mono:wght@400;700' },
  { id: 'fira-code', label: 'Fira Code', fontFamily: '"Fira Code", monospace', sample: 'Fira Code 01', source: 'google', googleFamily: 'Fira+Code:wght@400;700' },
  { id: 'ibm-plex', label: 'IBM Plex Mono', fontFamily: '"IBM Plex Mono", monospace', sample: 'IBM Plex 01', source: 'google', googleFamily: 'IBM+Plex+Mono:wght@400;700' },
]

export const ALIGN_OPTIONS: { id: TextAlign; label: string }[] = [
  { id: 'none', label: '无' },
  { id: 'left', label: '左' },
  { id: 'center', label: '中' },
  { id: 'right', label: '右' },
]

export const H_PADDING = 16

export function normalizeColorHex(color: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toUpperCase()
  return color
}
