export type TextAlign = 'none' | 'left' | 'center' | 'right'
export type TextDecoration = 'none' | 'underline' | 'line-through'

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
}

export type FontSource = 'system' | 'google'

export interface FontOption {
  id: string
  label: string
  fontFamily: string
  sample: string
  source: FontSource
  googleFamily?: string
}

export { FONT_OPTIONS } from './data/fonts'

export const ALIGN_OPTIONS: { id: TextAlign; label: string }[] = [
  { id: 'none', label: '无' },
  { id: 'left', label: '左' },
  { id: 'center', label: '中' },
  { id: 'right', label: '右' },
]

export const H_PADDING = 16

export function normalizeColorHex(color: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toUpperCase()
  return color
}
