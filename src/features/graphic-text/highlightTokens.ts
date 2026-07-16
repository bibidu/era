import { paginateDocument } from './layout'
import { parseScopedMarkdown, type GraphicDocument } from './document'
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

export function buildHighlightDisplayLinesFromDocument(document: GraphicDocument): HighlightDisplayLine[] {
  const result: HighlightDisplayLine[] = []

  document.blocks.forEach((block, index) => {
    if (index > 0) {
      result.push({ tokens: [], isParagraphBreak: true })
    }
    if (block.kind === 'image') return

    const mdBlocks = parseScopedMarkdown(block.id, block.text)
    mdBlocks.forEach((mdBlock, blockIndex) => {
      if (blockIndex > 0) {
        result.push({ tokens: [], isParagraphBreak: true })
      }
      const plain = stripHighlightMarkers(mdBlock.text)
      if (!plain) return
      result.push({ tokens: tokensFromText(mdBlock.id, plain, 0) })
    })
  })

  return result
}

export function buildHighlightDisplayLines(markdown: string): HighlightDisplayLine[] {
  return buildHighlightDisplayLinesFromDocument({
    blocks: [{ id: 'legacy', kind: 'markdown', text: markdown }],
    assets: {},
  })
}

/** @deprecated 使用 buildHighlightDisplayLines */
export function buildHighlightCharTokens(markdown: string): HighlightCharToken[] {
  return buildHighlightDisplayLines(markdown).flatMap((line) => line.tokens)
}

export function charHighlightKey(blockId: string, charIndex: number) {
  return `${blockId}:${charIndex}`
}

export function buildHighlightCharPageMapFromDocument(
  document: GraphicDocument,
  config: GraphicTextConfig,
) {
  const pages = paginateDocument(document, config)
  const map = new Map<string, number>()

  pages.forEach((page, pageIndex) => {
    const pageNumber = pageIndex + 1
    for (const block of page.blocks) {
      if (block.type === 'image') continue
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

export function buildHighlightCharPageMap(markdown: string, config: GraphicTextConfig) {
  return buildHighlightCharPageMapFromDocument(
    { blocks: [{ id: 'legacy', kind: 'markdown', text: markdown }], assets: {} },
    config,
  )
}
