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
    textAlign: aligned ? (text.textAlign as 'left' | 'center' | 'right') : undefined,
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
    maxWidth: '100%',
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

/** 与 DOM 预览一致的文本换行最大宽度（逻辑像素） */
export function getTextWrapMaxWidth(text: TextElement, containerWidth: number): number {
  const aligned = text.textAlign !== 'none'
  if (aligned) {
    return Math.max(0, containerWidth - H_PADDING * 2)
  }
  return Math.max(0, containerWidth - text.x - H_PADDING)
}

function wrapParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number,
): string[] {
  if (!paragraph) return ['']
  if (maxWidth <= 0) return [paragraph]

  const lines: string[] = []
  let line = ''

  for (const ch of paragraph) {
    const candidate = line + ch
    if (line && ctx.measureText(candidate).width > maxWidth) {
      const spaceIdx = line.lastIndexOf(' ')
      if (spaceIdx > 0) {
        lines.push(line.slice(0, spaceIdx))
        line = line.slice(spaceIdx + 1) + ch
      } else {
        lines.push(line)
        line = ch
      }
    } else {
      line = candidate
    }
  }

  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

/** 将文本按 Canvas 度量折行，匹配 pre-wrap + break-word 行为 */
export function wrapTextContentToLines(
  ctx: CanvasRenderingContext2D,
  content: string,
  maxWidth: number,
): string[] {
  if (!content) return []
  const lines: string[] = []
  for (const paragraph of content.split('\n')) {
    lines.push(...wrapParagraph(ctx, paragraph, maxWidth))
  }
  return lines
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
