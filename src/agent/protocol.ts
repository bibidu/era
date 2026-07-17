/** Agent 通道与 REST/MCP 共用的纯协议类型（无 DOM 依赖） */

export const ERA_AGENT_DEFAULT_PORT = 3847
export const ERA_AGENT_DEFAULT_HOST = '127.0.0.1'

export type HighlightStyle = 'underline' | 'brush' | 'quote' | 'circle'

export interface HighlightRange {
  style: HighlightStyle
  blockId: string
  /** 该 block 纯文本（去高亮标记后）的起始字符下标，含 */
  start: number
  /** 结束字符下标，不含 */
  end: number
  color: string
}

export interface EraProjectMeta {
  title?: string
  topic?: string
}

/** 与前端 GraphicDocument / GraphicTextConfig 对齐的可序列化快照 */
export interface EraProjectSnapshot {
  version: 1
  document: unknown
  config: unknown
  meta?: EraProjectMeta
}

export type LayoutWarningCode =
  | 'line_overflow'
  | 'orphan_line'
  | 'punctuation_only_line'
  | 'title_missing_circle'
  | 'circle_wrapped'
  | 'title_circle_wrapped'
  | 'too_many_colors'
  | 'title_line_height_loose'

export interface LayoutWarning {
  code: LayoutWarningCode
  message: string
  pageIndex: number
  blockId?: string
  text?: string
}

export interface BlockSummary {
  id: string
  type: string
  text: string
  plainText: string
}

export type BridgeCommandType =
  | 'ping'
  | 'sync_project'
  | 'preview_layout'
  | 'export_images'

export interface BridgeCommand {
  id: string
  type: BridgeCommandType
  projectId: string
  payload?: Record<string, unknown>
}

export interface BridgeResponse {
  id: string
  ok: boolean
  error?: string
  data?: Record<string, unknown>
}

export const HIGHLIGHT_STYLES: { id: HighlightStyle; label: string }[] = [
  { id: 'underline', label: '下划线高亮' },
  { id: 'brush', label: '笔刷高亮' },
  { id: 'quote', label: '引用条高亮' },
  { id: 'circle', label: '手绘圈高亮' },
]

export const ASPECT_RATIO_HINTS = {
  '3:4': '小红书风格',
  '9:16': '抖音风格',
} as const
