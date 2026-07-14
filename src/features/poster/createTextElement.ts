import { FONT_OPTIONS } from '../../data/fonts'
import type { TextElement } from '../../types'

export function createTextElement(): TextElement {
  return {
    id: crypto.randomUUID(),
    content: '',
    x: 60,
    y: 120,
    fontSize: 24,
    fontWeight: 400,
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#EF4444',
    fontFamily: FONT_OPTIONS[0].fontFamily,
    fontId: FONT_OPTIONS[0].id,
    textAlign: 'none',
    textStylePreset: 'plain',
    backgroundColor: null,
  }
}
