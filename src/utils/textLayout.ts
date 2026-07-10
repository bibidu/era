import type { TextElement } from '../types'
import { H_PADDING } from '../types'

export function getWrapperStyle(text: TextElement) {
  const aligned = text.textAlign !== 'none'

  return {
    position: 'absolute' as const,
    left: aligned ? H_PADDING : text.x,
    top: text.y,
    width: aligned ? `calc(100% - ${H_PADDING * 2}px)` : 'max-content',
    maxWidth: aligned ? undefined : 'calc(100% - 16px)',
  }
}

export function getTextContentStyle(text: TextElement) {
  const aligned = text.textAlign !== 'none'

  return {
    fontSize: text.fontSize,
    fontWeight: text.fontWeight,
    fontStyle: text.fontStyle,
    textDecoration: text.textDecoration,
    color: text.color,
    fontFamily: text.fontFamily,
    textAlign: (aligned ? text.textAlign : 'left') as 'left' | 'center' | 'right',
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.2,
    wordBreak: 'break-word' as const,
  }
}
