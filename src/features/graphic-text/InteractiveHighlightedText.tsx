import { type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import {
  HAND_DRAWN_CIRCLE_PATH,
  HAND_DRAWN_CIRCLE_STROKE_WIDTH,
  HAND_DRAWN_CIRCLE_VIEWBOX,
  buildCircleHighlightColorRuns,
} from './circleHighlight'
import { parseGlyphEmphasis } from './glyphEmphasis'
import { themeAlpha, stripHighlightMarkers } from './inlineHighlight'
import type { MarkdownBlock } from './types'

export type InteractiveHighlightStyle =
  | 'underline'
  | 'handUnderline'
  | 'brush'
  | 'quote'
  | 'circle'
  | 'color'

export interface InteractiveHighlightHandlers {
  activeStyle: InteractiveHighlightStyle
  onCharPointerDown: (
    key: string,
    activeForStyle: boolean,
    event: ReactPointerEvent<HTMLElement>,
  ) => void
}

function charKey(blockId: string, index: number) {
  return `${blockId}:${index}`
}

function InteractiveChar({
  char,
  charKeyValue,
  brushColor,
  underlineColor,
  textColor,
  emphasisRaw,
  onPointerDown,
}: {
  char: string
  charKeyValue: string
  brushColor: string | null
  underlineColor: string | null
  textColor: string | null
  emphasisRaw?: string | null
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
}) {
  const emphasis = parseGlyphEmphasis(emphasisRaw)
  const emphasisColor = emphasis?.color
  const style: CSSProperties = {
    ...(brushColor ? { backgroundColor: themeAlpha(brushColor, 0.28) } : null),
    ...(underlineColor
      ? { ['--graphic-highlight-underline' as string]: underlineColor }
      : null),
    ...(textColor || emphasisColor ? { color: textColor || emphasisColor } : null),
    ...(emphasis
      ? emphasis.widthEm != null
        ? {
            fontFamily: emphasis.fontFamily,
            fontSize:
              emphasis.fontSize != null
                ? `calc(${(emphasis.fontSize / 360) * 100}cqw * var(--title-fit-scale, 1))`
                : undefined,
            transform: `scale(${emphasis.scaleX}, ${emphasis.scaleY})`,
            transformOrigin: 'center center',
            display: 'inline-block',
            width: `${emphasis.widthEm}em`,
            boxSizing: 'content-box',
            textAlign: 'center' as const,
            verticalAlign: 'baseline',
          }
        : {
            fontFamily: emphasis.fontFamily,
            fontSize:
              emphasis.fontSize != null
                ? `calc(${(emphasis.fontSize / 360) * 100}cqw * var(--title-fit-scale, 1))`
                : undefined,
            transform: `scale(${emphasis.scaleX}, ${emphasis.scaleY})`,
            transformOrigin: 'center center',
            display: 'inline-block',
            // transform 不占布局：用 width≈视觉宽 + 左右 padding 留出字距
            width: `${emphasis.scaleX}em`,
            paddingLeft: '0.28em',
            paddingRight: '0.28em',
            boxSizing: 'content-box',
            textAlign: 'center' as const,
            verticalAlign: 'baseline',
          }
      : null),
  }

  const className = [
    'graphic-interactive-char',
    brushColor ? 'graphic-theme-brush' : '',
    underlineColor ? 'graphic-theme-underline' : '',
    emphasis ? 'graphic-glyph-emphasis' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      data-highlight-token={charKeyValue}
      className={className}
      style={style}
      onPointerDown={onPointerDown}
    >
      {char === ' ' ? '\u00a0' : char}
    </span>
  )
}

/** 在真实排版文字上逐字渲染：可点选/滑动；连续同色画圈合并为一圈 */
export function InteractiveHighlightedChars({
  text,
  block,
  brushColors,
  underlineColors,
  circleColors,
  quoteColors,
  textColors = {},
  glyphEmphasis = {},
  interaction,
}: {
  text: string
  block: MarkdownBlock
  brushColors: Readonly<Record<string, string>>
  underlineColors: Readonly<Record<string, string>>
  circleColors: Readonly<Record<string, string>>
  quoteColors: Readonly<Record<string, string>>
  textColors?: Readonly<Record<string, string>>
  glyphEmphasis?: Readonly<Record<string, string>>
  interaction: InteractiveHighlightHandlers
}): ReactNode {
  const blockId = block.sourceBlockId ?? block.id
  const charOffset = block.charOffset ?? 0
  const plain = stripHighlightMarkers(text)
  if (!plain) return null

  const circleRuns = buildCircleHighlightColorRuns(plain, blockId, charOffset, circleColors)
  const parts: ReactNode[] = []
  let index = 0
  let runCursor = 0

  const makeChar = (relativeIndex: number, circled: boolean) => {
    const absolute = charOffset + relativeIndex
    const key = charKey(blockId, absolute)
    const brushColor = brushColors[key] ?? null
    const underlineColor = underlineColors[key] ?? null
    const quoteColor = quoteColors[key] ?? null
    const textColor = textColors[key] ?? null
    const emphasisRaw = glyphEmphasis[key] ?? null

    let activeForStyle = false
    switch (interaction.activeStyle) {
      case 'brush':
        activeForStyle = Boolean(brushColor)
        break
      case 'underline':
      case 'handUnderline':
        activeForStyle = Boolean(underlineColor)
        break
      case 'circle':
        activeForStyle = circled
        break
      case 'quote':
        activeForStyle = Boolean(quoteColor)
        break
      case 'color':
        activeForStyle = Boolean(textColor)
        break
    }

    return (
      <InteractiveChar
        key={key}
        char={plain[relativeIndex] ?? ''}
        charKeyValue={key}
        brushColor={brushColor}
        underlineColor={underlineColor}
        textColor={textColor}
        emphasisRaw={emphasisRaw}
        onPointerDown={(event) => interaction.onCharPointerDown(key, activeForStyle, event)}
      />
    )
  }

  while (index < plain.length) {
    const run = circleRuns[runCursor]
    if (run && index === run.start) {
      const chars: ReactNode[] = []
      for (let i = run.start; i < run.end; i += 1) {
        chars.push(makeChar(i, true))
      }
      parts.push(
        <span key={`circle-${index}`} className="graphic-circle-highlight">
          <span className="graphic-circle-highlight-text">{chars}</span>
          <svg
            className="graphic-circle-highlight-svg"
            viewBox={HAND_DRAWN_CIRCLE_VIEWBOX}
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d={HAND_DRAWN_CIRCLE_PATH}
              fill="none"
              stroke={run.color}
              strokeWidth={HAND_DRAWN_CIRCLE_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>,
      )
      index = run.end
      runCursor += 1
      continue
    }

    const nextCircleStart = run?.start ?? plain.length
    const end = Math.min(nextCircleStart, plain.length)
    for (let i = index; i < end; i += 1) {
      parts.push(makeChar(i, false))
    }
    index = end
  }

  return <>{parts}</>
}
