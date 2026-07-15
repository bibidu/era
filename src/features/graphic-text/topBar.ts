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
  config: Pick<GraphicTextConfig, 'topText'>,
  markdown: string,
): TopBarParts {
  const custom = config.topText.trim()
  const countText = `全文 ${countMarkdownChars(markdown)} 字`
  return { custom: custom || null, countText }
}

export function resolveTopBarText(config: Pick<GraphicTextConfig, 'topText'>, markdown: string) {
  const { custom, countText } = resolveTopBarParts(config, markdown)
  if (custom) return `${custom} | ${countText}`
  return countText
}

export function getViewportHeight() {
  if (typeof window === 'undefined') return 800
  return window.visualViewport?.height ?? window.innerHeight
}

export function computeDefaultSheetHeight(viewportHeight = getViewportHeight()) {
  return Math.max(
    300,
    Math.min(Math.round(viewportHeight * 0.46), viewportHeight - 200),
  )
}

export function clampSheetHeight(height: number, viewportHeight = getViewportHeight()) {
  return Math.max(300, Math.min(height, viewportHeight - 200))
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
