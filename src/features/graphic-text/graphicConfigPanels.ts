import type { LucideIcon } from 'lucide-react'
import {
  CaseSensitive,
  Highlighter,
  LayoutTemplate,
  Ratio,
  Rows3,
  ScanEye,
  TextCursorInput,
  Type,
} from 'lucide-react'

export type GraphicConfigPanel = 'font-size' | 'text-style' | 'highlight' | 'template' | 'top-text'

export type ToolbarStrip = 'font' | 'aspect'

export const GRAPHIC_SHEET_PANELS: {
  id: GraphicConfigPanel
  label: string
  icon: LucideIcon
}[] = [
  { id: 'font-size', label: '字体大小', icon: CaseSensitive },
  { id: 'text-style', label: '文字样式', icon: Rows3 },
  { id: 'highlight', label: '高亮', icon: Highlighter },
  { id: 'template', label: '模板', icon: LayoutTemplate },
  { id: 'top-text', label: '顶部', icon: TextCursorInput },
]

export const GRAPHIC_TOOLBAR_STRIPS: {
  id: ToolbarStrip
  label: string
  icon: LucideIcon
}[] = [
  { id: 'font', label: '字体', icon: Type },
  { id: 'aspect', label: '比例', icon: Ratio },
]

export const GRAPHIC_TOOLBAR_TOGGLES = [
  { id: 'safe-area' as const, label: '安全区', icon: ScanEye },
]

export const GRAPHIC_CONFIG_PANEL_TITLES: Record<GraphicConfigPanel, string> = {
  'font-size': '字体大小',
  'text-style': '文字样式',
  highlight: '高亮设置',
  template: '页面模板',
  'top-text': '顶部文案',
}
