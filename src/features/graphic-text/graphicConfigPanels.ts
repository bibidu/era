import type { LucideIcon } from 'lucide-react'
import {
  CaseSensitive,
  Highlighter,
  LayoutTemplate,
  Rows3,
  ScanEye,
  TextCursorInput,
  Type,
} from 'lucide-react'

export type GraphicConfigPanel =
  | 'font'
  | 'font-size'
  | 'text-style'
  | 'highlight'
  | 'aspect'
  | 'template'
  | 'top-text'

export const GRAPHIC_CONFIG_PANELS: {
  id: GraphicConfigPanel
  label: string
  icon: LucideIcon
}[] = [
  { id: 'font', label: '字体', icon: Type },
  { id: 'font-size', label: '字体大小', icon: CaseSensitive },
  { id: 'text-style', label: '文字样式', icon: Rows3 },
  { id: 'highlight', label: '高亮', icon: Highlighter },
  { id: 'aspect', label: '比例', icon: ScanEye },
  { id: 'template', label: '模板', icon: LayoutTemplate },
  { id: 'top-text', label: '顶部', icon: TextCursorInput },
]

export const GRAPHIC_CONFIG_PANEL_TITLES: Record<GraphicConfigPanel, string> = {
  font: '字体',
  'font-size': '字体大小',
  'text-style': '文字样式',
  highlight: '高亮设置',
  aspect: '图片比例',
  template: '页面模板',
  'top-text': '顶部文案',
}
