import type { CSSProperties } from 'react'
import type { TextElement, TextStylePreset } from '../types'
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

export function resolvePresetColors(text: TextElement) {
  const color = text.color
  switch (text.textStylePreset ?? 'plain') {
    case 'box':
    case 'box-stroke':
      return {
        color,
        backgroundColor: text.backgroundColor ?? '#FFFFFF',
        borderColor: text.textStylePreset === 'box-stroke' ? '#000000' : 'transparent',
      }
    case 'fill':
      return {
        color,
        backgroundColor: text.backgroundColor ?? '#6B7280',
        borderColor: 'transparent',
      }
    default:
      return { color, backgroundColor: 'transparent', borderColor: color }
  }
}

export function getTextContentStyle(text: TextElement): CSSProperties {
  const aligned = text.textAlign !== 'none'
  const { color, backgroundColor, borderColor } = resolvePresetColors(text)
  const base: CSSProperties = {
    fontSize: text.fontSize,
    fontWeight: text.fontWeight,
    fontStyle: text.fontStyle,
    textDecoration: text.textDecoration,
    fontFamily: text.fontFamily,
    textAlign: (aligned ? text.textAlign : 'left') as 'left' | 'center' | 'right',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.2,
    wordBreak: 'break-word',
    display: 'inline-block',
  }

  switch (text.textStylePreset ?? 'plain') {
    case 'border':
      return {
        ...base,
        color,
        backgroundColor: 'transparent',
        border: `2px solid ${color}`,
        borderRadius: 6,
        padding: '2px 8px',
      }
    case 'outline':
      return {
        ...base,
        color: 'transparent',
        WebkitTextStroke: `2px ${color}`,
        paintOrder: 'stroke fill',
      }
    case 'box':
      return {
        ...base,
        color,
        backgroundColor,
        borderRadius: 2,
        padding: '2px 8px',
      }
    case 'box-stroke':
      return {
        ...base,
        color,
        backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 2,
        padding: '2px 8px',
      }
    case 'fill':
      return {
        ...base,
        color,
        backgroundColor,
        borderRadius: 2,
        padding: '2px 8px',
      }
    default:
      return { ...base, color, backgroundColor: 'transparent' }
  }
}

export function getPresetBackground(text: TextElement): string | null {
  if (text.textStylePreset === 'box' || text.textStylePreset === 'box-stroke') {
    return text.backgroundColor ?? '#FFFFFF'
  }
  if (text.textStylePreset === 'fill') {
    return text.backgroundColor ?? '#6B7280'
  }
  return null
}

export function getPresetUpdates(preset: TextStylePreset): Partial<TextElement> {
  switch (preset) {
    case 'box':
    case 'box-stroke':
      return { textStylePreset: preset, backgroundColor: '#FFFFFF', color: '#000000' }
    case 'fill':
      return { textStylePreset: preset, backgroundColor: '#6B7280', color: '#FFFFFF' }
    default:
      return { textStylePreset: preset, backgroundColor: null }
  }
}
