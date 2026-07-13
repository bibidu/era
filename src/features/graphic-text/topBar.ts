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
    Math.min(Math.round(viewportHeight * 0.52), viewportHeight - 140),
  )
}

export function clampSheetHeight(height: number, viewportHeight = getViewportHeight()) {
  return Math.max(300, Math.min(height, viewportHeight - 140))
}
