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

export interface CharColorSegment {
  text: string
  color: string | null
}

export function buildCharHighlightColorSegments(
  text: string,
  blockId: string,
  colorMap: Readonly<Record<string, string>>,
  charOffset = 0,
): CharColorSegment[] {
  const plain = stripHighlightMarkers(text)
  const segments: CharColorSegment[] = []
  let current = ''
  let currentColor: string | null = colorMap[`${blockId}:${charOffset}`] ?? null

  ;[...plain].forEach((char, index) => {
    const color = colorMap[`${blockId}:${charOffset + index}`] ?? null
    if (!segments.length && index === 0) {
      current = char
      currentColor = color
      return
    }
    if (color === currentColor) {
      current += char
    } else {
      if (current) segments.push({ text: current, color: currentColor })
      current = char
      currentColor = color
    }
  })

  if (current) segments.push({ text: current, color: currentColor })
  return segments.length ? segments : [{ text: plain, color: null }]
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

export function blockHasHighlightedChar(
  block: { sourceBlockId?: string; id: string; text: string; charOffset?: number },
  highlightedKeys: ReadonlySet<string>,
) {
  const blockId = block.sourceBlockId ?? block.id
  const charOffset = block.charOffset ?? 0
  const plain = stripHighlightMarkers(block.text)
  for (let index = 0; index < plain.length; index += 1) {
    if (highlightedKeys.has(`${blockId}:${charOffset + index}`)) return true
  }
  return false
}

export function themeAlpha(color: string, alpha: number) {
  const hex = color.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(250, 204, 21, ${alpha})`
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface ThemeHighlightSegment {
  text: string
  brushColor: string | null
  underlineColor: string | null
  handUnderlineColor: string | null
}

export function buildMergedThemeHighlightSegments(
  text: string,
  blockId: string,
  brushColors: Readonly<Record<string, string>>,
  underlineColors: Readonly<Record<string, string>>,
  handUnderlineColors: Readonly<Record<string, string>>,
  charOffset = 0,
): ThemeHighlightSegment[] {
  const plain = stripHighlightMarkers(text)
  const segments: ThemeHighlightSegment[] = []
  let currentText = ''
  let currentBrush: string | null = null
  let currentUnderline: string | null = null
  let currentHandUnderline: string | null = null

  const flush = () => {
    if (!currentText) return
    segments.push({
      text: currentText,
      brushColor: currentBrush,
      underlineColor: currentUnderline,
      handUnderlineColor: currentHandUnderline,
    })
    currentText = ''
  }

  for (let index = 0; index < plain.length; index += 1) {
    const key = `${blockId}:${charOffset + index}`
    const brushColor = brushColors[key] ?? null
    const underlineColor = underlineColors[key] ?? null
    const handUnderlineColor = handUnderlineColors[key] ?? null

    if (
      brushColor === currentBrush &&
      underlineColor === currentUnderline &&
      handUnderlineColor === currentHandUnderline
    ) {
      currentText += plain[index]
      continue
    }

    flush()
    currentBrush = brushColor
    currentUnderline = underlineColor
    currentHandUnderline = handUnderlineColor
    currentText = plain[index] ?? ''
  }

  flush()
  return segments.length
    ? segments
    : [{ text: plain, brushColor: null, underlineColor: null, handUnderlineColor: null }]
}
