export type FontSource = 'system' | 'google' | 'cdn'

export interface FontOption {
  id: string
  label: string
  fontFamily: string
  sample: string
  source: FontSource
  googleFamily?: string
  cdnUrl?: string
}

/** 标题/正文可选字体 */
export const TEXT_FONT_OPTIONS: FontOption[] = [
  { id: 'pingfang', label: '苹方', fontFamily: '"PingFang SC", sans-serif', sample: '苹方', source: 'system' },
  { id: 'yahei', label: '微软雅黑', fontFamily: '"Microsoft YaHei", sans-serif', sample: '微软雅黑', source: 'system' },
  {
    id: 'heiti',
    label: '黑体',
    fontFamily: '"Noto Sans SC", sans-serif',
    sample: '黑体',
    source: 'google',
    googleFamily: 'Noto+Sans+SC:wght@400;700',
  },
  {
    id: 'song',
    label: '宋体',
    fontFamily: '"Noto Serif SC", serif',
    sample: '宋体',
    source: 'google',
    googleFamily: 'Noto+Serif+SC:wght@400;700',
  },
  {
    id: 'kai',
    label: '楷体',
    fontFamily: '"LXGW WenKai GB", serif',
    sample: '楷体',
    source: 'cdn',
    cdnUrl: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-gb-web@1.521.0/lxgwwenkaigb-regular/result.css',
  },
]

/** 代码块可选等宽字体 */
export const CODE_FONT_OPTIONS: FontOption[] = [
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    fontFamily: '"JetBrains Mono", monospace',
    sample: 'const code = 1',
    source: 'google',
    googleFamily: 'JetBrains+Mono:wght@400;700',
  },
  {
    id: 'ibm-plex-mono',
    label: 'IBM Plex Mono',
    fontFamily: '"IBM Plex Mono", monospace',
    sample: 'const code = 1',
    source: 'google',
    googleFamily: 'IBM+Plex+Mono:wght@400;700',
  },
  { id: 'menlo', label: 'Menlo', fontFamily: 'Menlo, monospace', sample: 'const code = 1', source: 'system' },
  {
    id: 'ubuntu-mono',
    label: 'Ubuntu Mono',
    fontFamily: '"Ubuntu Mono", monospace',
    sample: 'const code = 1',
    source: 'google',
    googleFamily: 'Ubuntu+Mono:wght@400;700',
  },
]

export const FONT_OPTIONS = TEXT_FONT_OPTIONS

export const ALL_FONT_OPTIONS: FontOption[] = [...TEXT_FONT_OPTIONS, ...CODE_FONT_OPTIONS]

export const FONT_COUNT = FONT_OPTIONS.length

export const CLASSIC_WEB_FONT_IDS = ['heiti', 'song', 'kai'] as const

const DEFAULT_TEXT_FONT = TEXT_FONT_OPTIONS.find((font) => font.id === 'song') ?? TEXT_FONT_OPTIONS[0]
const DEFAULT_CODE_FONT = CODE_FONT_OPTIONS.find((font) => font.id === 'menlo') ?? CODE_FONT_OPTIONS[0]

export function getFontById(id: string): FontOption {
  return ALL_FONT_OPTIONS.find((font) => font.id === id) ?? DEFAULT_TEXT_FONT
}

export function getDefaultTextFont(): FontOption {
  return DEFAULT_TEXT_FONT
}

export function getDefaultCodeFont(): FontOption {
  return DEFAULT_CODE_FONT
}

export function getFontOptionsForTarget(target: 'title' | 'heading' | 'body' | 'code'): FontOption[] {
  return target === 'code' ? CODE_FONT_OPTIONS : TEXT_FONT_OPTIONS
}
