import { stripHighlightMarkers } from './inlineHighlight'
import type { MarkdownBlockType } from './types'

export interface HighlightCharToken {
  key: string
  char: string
  blockId: string
}

export interface HighlightDisplayLine {
  tokens: HighlightCharToken[]
  isParagraphBreak?: boolean
}

function createBlockId(index: number, type: MarkdownBlockType) {
  return `${index}-${type}`
}

function tokensFromText(blockId: string, text: string, startOffset: number): HighlightCharToken[] {
  const plain = stripHighlightMarkers(text)
  return [...plain].map((char, index) => ({
    key: `${blockId}:${startOffset + index}`,
    char,
    blockId,
  }))
}

function emitParagraphLines(
  lines: string[],
  blockIndex: number,
  result: HighlightDisplayLine[],
): number {
  const blockId = createBlockId(blockIndex, 'paragraph')
  let offset = 0

  lines.forEach((line, lineIndex) => {
    const plain = stripHighlightMarkers(line.trim())
    result.push({ tokens: tokensFromText(blockId, plain, offset) })
    offset += plain.length
    if (lineIndex < lines.length - 1) {
      result[result.length - 1].tokens.push({
        key: `${blockId}:${offset}`,
        char: ' ',
        blockId,
      })
      offset += 1
    }
  })

  return blockIndex + 1
}

export function buildHighlightDisplayLines(markdown: string): HighlightDisplayLine[] {
  const rawLines = markdown.replace(/\r\n/g, '\n').split('\n')
  const result: HighlightDisplayLine[] = []
  let blockIndex = 0
  let paragraphLines: string[] = []

  const flushParagraph = () => {
    if (!paragraphLines.length) return
    blockIndex = emitParagraphLines(paragraphLines, blockIndex, result)
    paragraphLines = []
  }

  for (const rawLine of rawLines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      result.push({ tokens: [], isParagraphBreak: true })
      continue
    }

    if (line.startsWith('# ')) {
      flushParagraph()
      const blockId = createBlockId(blockIndex, 'title')
      const plain = stripHighlightMarkers(line.slice(2).trim())
      result.push({ tokens: tokensFromText(blockId, plain, 0) })
      blockIndex += 1
    } else if (/^#{2,6}\s/.test(line)) {
      flushParagraph()
      const blockId = createBlockId(blockIndex, 'heading')
      const plain = stripHighlightMarkers(line.replace(/^#{2,6}\s+/, ''))
      result.push({ tokens: tokensFromText(blockId, plain, 0) })
      blockIndex += 1
    } else if (/^[-*+]\s/.test(line)) {
      flushParagraph()
      const blockId = createBlockId(blockIndex, 'paragraph')
      const plain = stripHighlightMarkers(line.replace(/^[-*+]\s+/, ''))
      result.push({ tokens: tokensFromText(blockId, plain, 0) })
      blockIndex += 1
    } else if (/^\d+\.\s/.test(line)) {
      flushParagraph()
      const blockId = createBlockId(blockIndex, 'paragraph')
      const plain = stripHighlightMarkers(line.replace(/^\d+\.\s+/, ''))
      result.push({ tokens: tokensFromText(blockId, plain, 0) })
      blockIndex += 1
    } else if (line.startsWith('> ')) {
      flushParagraph()
      const blockId = createBlockId(blockIndex, 'paragraph')
      const plain = stripHighlightMarkers(line.slice(2).trim())
      result.push({ tokens: tokensFromText(blockId, plain, 0) })
      blockIndex += 1
    } else {
      paragraphLines.push(line)
    }
  }

  flushParagraph()
  return result
}

/** @deprecated 使用 buildHighlightDisplayLines */
export function buildHighlightCharTokens(markdown: string): HighlightCharToken[] {
  return buildHighlightDisplayLines(markdown).flatMap((line) => line.tokens)
}

export function charHighlightKey(blockId: string, charIndex: number) {
  return `${blockId}:${charIndex}`
}
