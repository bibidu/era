import { paginateMarkdown, parseMarkdown } from './layout'
import { stripHighlightMarkers } from './inlineHighlight'
import type { GraphicTextConfig } from './types'

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

export function buildHighlightCharPageMap(markdown: string, config: GraphicTextConfig) {
  const pages = paginateMarkdown(markdown, config)
  const map = new Map<string, number>()

  pages.forEach((page, pageIndex) => {
    const pageNumber = pageIndex + 1
    for (const block of page.blocks) {
      const sourceId = block.sourceBlockId ?? block.id
      const offset = block.charOffset ?? 0
      const plain = stripHighlightMarkers(block.text)
      for (let index = 0; index < plain.length; index += 1) {
        map.set(charHighlightKey(sourceId, offset + index), pageNumber)
      }
    }
  })

  return map
}
