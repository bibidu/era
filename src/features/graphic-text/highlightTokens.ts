import { parseMarkdown } from './layout'
import { stripHighlightMarkers } from './inlineHighlight'

export interface HighlightCharToken {
  key: string
  char: string
  blockId: string
}

export interface HighlightDisplayLine {
  tokens: HighlightCharToken[]
  isParagraphBreak?: boolean
}

function tokensFromText(blockId: string, text: string, startOffset: number): HighlightCharToken[] {
  const plain = stripHighlightMarkers(text)
  return [...plain].map((char, index) => ({
    key: `${blockId}:${startOffset + index}`,
    char,
    blockId,
  }))
}

export function buildHighlightDisplayLines(markdown: string): HighlightDisplayLine[] {
  const blocks = parseMarkdown(markdown)
  const result: HighlightDisplayLine[] = []

  blocks.forEach((block, index) => {
    if (index > 0) {
      result.push({ tokens: [], isParagraphBreak: true })
    }

    const plain = stripHighlightMarkers(block.text)
    if (!plain) return

    result.push({ tokens: tokensFromText(block.id, plain, 0) })
  })

  return result
}

/** @deprecated 使用 buildHighlightDisplayLines */
export function buildHighlightCharTokens(markdown: string): HighlightCharToken[] {
  return buildHighlightDisplayLines(markdown).flatMap((line) => line.tokens)
}

export function charHighlightKey(blockId: string, charIndex: number) {
  return `${blockId}:${charIndex}`
}
