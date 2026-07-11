export type TextAlign = 'none' | 'left' | 'center' | 'right'
export type TextDecoration = 'none' | 'underline' | 'line-through'
export type TextStylePreset = 'plain' | 'border' | 'outline' | 'box' | 'box-stroke' | 'fill'

export interface TextElement {
  id: string
  content: string
  x: number
  y: number
  fontSize: number
  fontWeight: 400 | 700
  fontStyle: 'normal' | 'italic'
  textDecoration: TextDecoration
  color: string
  fontFamily: string
  fontId: string
  textAlign: TextAlign
  textStylePreset: TextStylePreset
  backgroundColor: string | null
}

export type FontSource = 'system' | 'google'

export type { FontOption } from './data/fonts'
export { FONT_OPTIONS, FONT_COUNT } from './data/fonts'

export const ALIGN_OPTIONS: { id: TextAlign; label: string }[] = [
  { id: 'left', label: '左' },
  { id: 'center', label: '中' },
  { id: 'right', label: '右' },
]

export const H_PADDING = 16

export function normalizeColorHex(color: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toUpperCase()
  return color
}
