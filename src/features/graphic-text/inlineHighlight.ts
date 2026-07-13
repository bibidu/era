export interface TextSegment {
  text: string
  highlighted: boolean
}

const LEGACY_HIGHLIGHT_PATTERN = /\[\[([^\]]+)\]\]|\*\*([^*]+)\*\*/g

export function parseInlineHighlights(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(LEGACY_HIGHLIGHT_PATTERN)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, index), highlighted: false })
    }
    segments.push({ text: match[1] ?? match[2] ?? '', highlighted: true })
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlighted: false })
  }

  return segments.length ? segments : [{ text, highlighted: false }]
}

export function stripHighlightMarkers(text: string) {
  return text.replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1')
}

export function buildCharHighlightSegments(
  text: string,
  blockId: string,
  highlightedKeys: ReadonlySet<string>,
  charOffset = 0,
): TextSegment[] {
  const plain = stripHighlightMarkers(text)
  const segments: TextSegment[] = []
  let current = ''
  let currentHighlighted = highlightedKeys.has(`${blockId}:${charOffset}`)

  ;[...plain].forEach((char, index) => {
    const highlighted = highlightedKeys.has(`${blockId}:${charOffset + index}`)
    if (!segments.length && index === 0) {
      current = char
      currentHighlighted = highlighted
      return
    }
    if (highlighted === currentHighlighted) {
      current += char
    } else {
      if (current) segments.push({ text: current, highlighted: currentHighlighted })
      current = char
      currentHighlighted = highlighted
    }
  })

  if (current) segments.push({ text: current, highlighted: currentHighlighted })
  return segments.length ? segments : [{ text: plain, highlighted: false }]
}

export function themeAlpha(color: string, alpha: number) {
  const hex = color.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(250, 204, 21, ${alpha})`
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
