import { parseMarkdown } from './layout'
import { stripHighlightMarkers } from './inlineHighlight'

export interface HighlightCharToken {
  key: string
  char: string
  blockId: string
}

export function buildHighlightCharTokens(markdown: string): HighlightCharToken[] {
  const blocks = parseMarkdown(markdown)
  const tokens: HighlightCharToken[] = []

  for (const block of blocks) {
    const plain = stripHighlightMarkers(block.text)
    ;[...plain].forEach((char, index) => {
      tokens.push({
        key: `${block.id}:${index}`,
        char,
        blockId: block.id,
      })
    })
  }

  return tokens
}

export function charHighlightKey(blockId: string, charIndex: number) {
  return `${blockId}:${charIndex}`
}
