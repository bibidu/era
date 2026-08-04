import { SHEET_MIN_HEIGHT_PX } from './graphicPreviewLayout'
import { stripHighlightMarkers } from './inlineHighlight'
import { parseMarkdown } from './layout'
import type { GraphicTextConfig } from './types'
import {
  GRAPHIC_SERIES_TOP_BAR_BORDER_COLOR,
  GRAPHIC_TOP_BAR_BORDER_COLOR,
} from './graphicContentColors'
import { FENGSHUI_TOP_BAR_LINE_COLOR } from './pageFengshuiTokens'

export const NON_FENGSHUI_TOP_BAR_TEXT = '点赞关注不迷路～'

/** 系列期数顶栏与下方二级标题之间的空行数（约等于正文行高） */
export const SERIES_LABEL_GAP_LINES = 3

export interface TopBarParts {
  custom: string | null
  countText: string
}

export function countMarkdownChars(markdown: string): number {
  const blocks = parseMarkdown(markdown)
  return blocks.reduce(
    (sum, block) => sum + [...stripHighlightMarkers(block.text)].length,
    0,
  )
}

export function hasSeriesLabel(config: Pick<GraphicTextConfig, 'seriesLabel'>): boolean {
  return Boolean(config.seriesLabel?.trim())
}

/** 内容首页（pageIndex=0，整套含封面时为第 2 页）是否展示系列期数顶栏 */
export function isSeriesLabelPage(
  config: Pick<GraphicTextConfig, 'seriesLabel'>,
  pageIndex: number,
): boolean {
  return pageIndex === 0 && hasSeriesLabel(config)
}

export function resolveTopBarParts(
  config: Pick<GraphicTextConfig, 'topText' | 'showWordCount' | 'pageOverlay' | 'seriesLabel'>,
  markdown: string,
  pageIndex = 0,
): TopBarParts {
  if (isSeriesLabelPage(config, pageIndex)) {
    return { custom: config.seriesLabel.trim(), countText: '' }
  }
  if (config.pageOverlay !== 'fengshui') {
    return { custom: NON_FENGSHUI_TOP_BAR_TEXT, countText: '' }
  }
  const custom = config.topText.trim()
  const showCount = config.showWordCount !== false
  const countText = showCount ? `全文 ${countMarkdownChars(markdown)} 字` : ''
  return { custom: custom || null, countText }
}

export function resolveTopBarBorderColor(
  config: Pick<GraphicTextConfig, 'pageOverlay' | 'seriesLabel'>,
  pageIndex = 0,
): string {
  if (isSeriesLabelPage(config, pageIndex)) return GRAPHIC_SERIES_TOP_BAR_BORDER_COLOR
  if (config.pageOverlay === 'fengshui') return FENGSHUI_TOP_BAR_LINE_COLOR
  return GRAPHIC_TOP_BAR_BORDER_COLOR
}

export function resolveTopBarText(
  config: Pick<GraphicTextConfig, 'topText' | 'showWordCount' | 'pageOverlay' | 'seriesLabel'>,
  markdown: string,
  pageIndex = 0,
) {
  const { custom, countText } = resolveTopBarParts(config, markdown, pageIndex)
  if (custom && countText) return `${custom} | ${countText}`
  if (custom) return custom
  return countText
}

export function getViewportHeight() {
  if (typeof window === 'undefined') return 800
  return window.visualViewport?.height ?? window.innerHeight
}

export function computeDefaultSheetHeight(viewportHeight = getViewportHeight()) {
  return Math.max(
    SHEET_MIN_HEIGHT_PX,
    Math.min(Math.round(viewportHeight * 0.46), viewportHeight - 200),
  )
}

export function clampSheetHeight(height: number, viewportHeight = getViewportHeight()) {
  return Math.max(SHEET_MIN_HEIGHT_PX, Math.min(height, viewportHeight - 200))
}

const SHEET_HEIGHT_STORAGE_KEY = 'era-graphic-config-sheet-height'

export function readCachedSheetHeight(viewportHeight = getViewportHeight()) {
  try {
    const raw = localStorage.getItem(SHEET_HEIGHT_STORAGE_KEY)
    if (raw) {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) {
        return clampSheetHeight(parsed, viewportHeight)
      }
    }
  } catch {
    // ignore storage read errors
  }
  return computeDefaultSheetHeight(viewportHeight)
}

export function writeCachedSheetHeight(height: number) {
  try {
    localStorage.setItem(SHEET_HEIGHT_STORAGE_KEY, String(Math.round(height)))
  } catch {
    // ignore storage write errors
  }
}
