import type { TextAlign, TextElement } from '../types'

const H_PADDING = 16

export function applyTextAlign(align: TextAlign): Partial<TextElement> {
  return { textAlign: align }
}

export function getTextStyle(text: TextElement, isSelected: boolean, isExporting: boolean) {
  const aligned = text.textAlign !== 'none'

  return {
    position: 'absolute' as const,
    left: aligned ? H_PADDING : text.x,
    top: text.y,
    width: aligned ? `calc(100% - ${H_PADDING * 2}px)` : 'auto',
    maxWidth: aligned ? undefined : 'calc(100% - 16px)',
    fontSize: text.fontSize,
    fontWeight: text.fontWeight,
    color: text.color,
    fontFamily: text.fontFamily,
    textAlign: (aligned ? text.textAlign : 'left') as 'left' | 'center' | 'right',
    outline: isSelected && !isExporting ? '1px dashed #000000' : 'none',
    outlineOffset: '2px',
  }
}
