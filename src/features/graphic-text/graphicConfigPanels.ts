import type { LucideIcon } from 'lucide-react'
import {
  CaseSensitive,
  Highlighter,
  LayoutTemplate,
  Ratio,
  ScanEye,
  TextCursorInput,
  Type,
} from 'lucide-react'

export type GraphicConfigPanel = 'highlight' | 'top-text'

export type ToolbarStrip = 'font' | 'aspect' | 'template'

export type FontSizeTarget = 'title' | 'heading' | 'body'

export type FontSizeNav = null | 'menu' | FontSizeTarget

export const GRAPHIC_SHEET_PANELS: {
  id: GraphicConfigPanel
  label: string
  icon: LucideIcon
}[] = [
  { id: 'highlight', label: '高亮', icon: Highlighter },
  { id: 'top-text', label: '顶部', icon: TextCursorInput },
]

export const GRAPHIC_FONT_SIZE_MENU = {
  id: 'font-size' as const,
  label: '字体大小',
  icon: CaseSensitive,
}

export const FONT_SIZE_TARGETS: { id: FontSizeTarget; label: string }[] = [
  { id: 'title', label: '标题' },
  { id: 'heading', label: '二级标题' },
  { id: 'body', label: '正文' },
]

export const GRAPHIC_TOOLBAR_STRIPS: {
  id: ToolbarStrip
  label: string
  icon: LucideIcon
}[] = [
  { id: 'font', label: '字体', icon: Type },
  { id: 'aspect', label: '比例', icon: Ratio },
  { id: 'template', label: '模板', icon: LayoutTemplate },
]

export const GRAPHIC_TOOLBAR_TOGGLES = [
  { id: 'safe-area' as const, label: '安全区', icon: ScanEye },
]
