import { SHEET_MIN_HEIGHT_PX } from './graphicPreviewLayout'
import { stripHighlightMarkers } from './inlineHighlight'
import { parseMarkdown } from './layout'
import type { GraphicTextConfig } from './types'

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

export function resolveTopBarParts(
  config: Pick<GraphicTextConfig, 'topText' | 'showWordCount'>,
  markdown: string,
): TopBarParts {
  const custom = config.topText.trim()
  const showCount = config.showWordCount !== false
  const countText = showCount ? `全文 ${countMarkdownChars(markdown)} 字` : ''
  return { custom: custom || null, countText }
}

export function resolveTopBarText(
  config: Pick<GraphicTextConfig, 'topText' | 'showWordCount'>,
  markdown: string,
) {
  const { custom, countText } = resolveTopBarParts(config, markdown)
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
