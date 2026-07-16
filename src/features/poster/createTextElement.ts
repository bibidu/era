import { getDefaultTextFont } from '../../data/fonts'
import type { TextElement } from '../../types'

export function createTextElement(): TextElement {
  const defaultFont = getDefaultTextFont()
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
    fontFamily: defaultFont.fontFamily,
    fontId: defaultFont.id,
    textAlign: 'none',
    textStylePreset: 'plain',
    backgroundColor: null,
  }
}
