import { stripHighlightMarkers } from './inlineHighlight'
import { parseMarkdown } from './layout'
import type { GraphicTextConfig } from './types'

export function countMarkdownChars(markdown: string): number {
  const blocks = parseMarkdown(markdown)
  return blocks.reduce(
    (sum, block) => sum + [...stripHighlightMarkers(block.text)].length,
    0,
  )
}

export function resolveTopBarText(config: Pick<GraphicTextConfig, 'topText'>, markdown: string) {
  const custom = config.topText.trim()
  if (custom) return custom
  return `全文 ${countMarkdownChars(markdown)} 字`
}
