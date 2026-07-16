import type { LucideIcon } from 'lucide-react'
import {
  CaseSensitive,
  Code2,
  Heading1,
  Heading2,
  Highlighter,
  Layers,
  LayoutTemplate,
  Pilcrow,
  Ratio,
  ScanEye,
  TextCursorInput,
} from 'lucide-react'

export type GraphicConfigPanel = 'highlight' | 'content'

export type ToolbarStrip = 'aspect' | 'template' | 'top-text'

export type TemplateNav = null | 'solid' | 'texture'

export type FontSizeTarget = 'title' | 'heading' | 'body' | 'code'

export type TextAdjustField = 'font' | 'fontSize' | 'lineHeight' | 'marginTop' | 'marginBottom'

export type FontSizeNav = null | 'menu' | FontSizeTarget

export const GRAPHIC_HIGHLIGHT_PANEL = {
  id: 'highlight' as const,
  label: '高亮',
  icon: Highlighter,
}

export const GRAPHIC_CONTENT_PANEL = {
  id: 'content' as const,
  label: '内容',
  icon: Layers,
}

export const GRAPHIC_TOP_TEXT_PANEL = {
  id: 'top-text' as const,
  label: '顶部',
  icon: TextCursorInput,
}

export const GRAPHIC_TEXT_ADJUST_MENU = {
  id: 'text-adjust' as const,
  label: '文字调节',
  icon: CaseSensitive,
}

/** @deprecated use GRAPHIC_TEXT_ADJUST_MENU */
export const GRAPHIC_FONT_SIZE_MENU = GRAPHIC_TEXT_ADJUST_MENU

export const FONT_SIZE_TARGETS: { id: FontSizeTarget; label: string; icon: LucideIcon }[] = [
  { id: 'title', label: '标题', icon: Heading1 },
  { id: 'heading', label: '二级标题', icon: Heading2 },
  { id: 'body', label: '正文', icon: Pilcrow },
  { id: 'code', label: '代码块', icon: Code2 },
]

export const TEXT_ADJUST_FIELDS: Record<
  FontSizeTarget,
  { id: TextAdjustField; label: string }[]
> = {
  title: [
    { id: 'font', label: '字体' },
    { id: 'fontSize', label: '字号' },
    { id: 'lineHeight', label: '行高' },
    { id: 'marginTop', label: '上间距' },
    { id: 'marginBottom', label: '下间距' },
  ],
  heading: [
    { id: 'font', label: '字体' },
    { id: 'fontSize', label: '字号' },
    { id: 'lineHeight', label: '行高' },
    { id: 'marginTop', label: '上间距' },
    { id: 'marginBottom', label: '下间距' },
  ],
  body: [
    { id: 'font', label: '字体' },
    { id: 'fontSize', label: '字号' },
    { id: 'lineHeight', label: '行高' },
  ],
  code: [
    { id: 'font', label: '字体' },
    { id: 'fontSize', label: '字号' },
    { id: 'lineHeight', label: '行高' },
  ],
}

export const GRAPHIC_TOOLBAR_STRIPS: {
  id: Exclude<ToolbarStrip, 'top-text'>
  label: string
  icon: LucideIcon
}[] = [
  { id: 'aspect', label: '比例', icon: Ratio },
  { id: 'template', label: '模板', icon: LayoutTemplate },
]

export const GRAPHIC_TOOLBAR_TOGGLES = [
  { id: 'safe-area' as const, label: '安全区', icon: ScanEye },
]
