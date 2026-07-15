import { stripHighlightMarkers } from './inlineHighlight'

export type HighlightColorMap = Record<string, string>

export interface HighlightPickerColors {
  underline: string
  quote: string
  circle: string
}

export type HighlightPickerColor = string

export const DEFAULT_HIGHLIGHT_PICKER_COLORS: HighlightPickerColors = {
  underline: '#FACC15',
  quote: '#FACC15',
  circle: '#FACC15',
}

export const THEME_COLORS = [
  '#FACC15',
  '#FB923C',
  '#EF4444',
  '#22C55E',
  '#3B82F6',
  '#A855F7',
  '#525252',
  '#9CA3AF',
  '#D1D5DB',
]

export function keysFromHighlightMap(map: HighlightColorMap): Set<string> {
  return new Set(Object.keys(map))
}

export function countHighlightSelections(
  underline: HighlightColorMap,
  quote: HighlightColorMap,
  circle: HighlightColorMap,
) {
  return Object.keys(underline).length + Object.keys(quote).length + Object.keys(circle).length
}

export function blockHasHighlightInMap(
  block: { sourceBlockId?: string; id: string; text: string; charOffset?: number },
  colorMap: Readonly<HighlightColorMap>,
) {
  const blockId = block.sourceBlockId ?? block.id
  const charOffset = block.charOffset ?? 0
  const plain = stripHighlightMarkers(block.text)
  for (let index = 0; index < plain.length; index += 1) {
    if (colorMap[`${blockId}:${charOffset + index}`]) return true
  }
  return false
}

export function resolveBlockHighlightColor(
  block: { sourceBlockId?: string; id: string; text: string; charOffset?: number },
  colorMap: Readonly<HighlightColorMap>,
) {
  const blockId = block.sourceBlockId ?? block.id
  const charOffset = block.charOffset ?? 0
  const plain = stripHighlightMarkers(block.text)
  for (let index = 0; index < plain.length; index += 1) {
    const color = colorMap[`${blockId}:${charOffset + index}`]
    if (color) return color
  }
  return null
}
