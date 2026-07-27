import { type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import {
  HAND_DRAWN_CIRCLE_PATH,
  HAND_DRAWN_CIRCLE_STROKE_WIDTH,
  HAND_DRAWN_CIRCLE_VIEWBOX,
  buildCircleHighlightColorRuns,
} from './circleHighlight'
import { themeAlpha, stripHighlightMarkers } from './inlineHighlight'
import type { MarkdownBlock } from './types'

export type InteractiveHighlightStyle =
  | 'underline'
  | 'handUnderline'
  | 'brush'
  | 'quote'
  | 'circle'

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
  onPointerDown,
}: {
  char: string
  charKeyValue: string
  brushColor: string | null
  underlineColor: string | null
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
}) {
  const style: CSSProperties = {
    ...(brushColor ? { backgroundColor: themeAlpha(brushColor, 0.28) } : null),
    ...(underlineColor
      ? { ['--graphic-highlight-underline' as string]: underlineColor }
      : null),
  }

  const className = [
    'graphic-interactive-char',
    brushColor ? 'graphic-theme-brush' : '',
    underlineColor ? 'graphic-theme-underline' : '',
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
  interaction,
}: {
  text: string
  block: MarkdownBlock
  brushColors: Readonly<Record<string, string>>
  underlineColors: Readonly<Record<string, string>>
  circleColors: Readonly<Record<string, string>>
  quoteColors: Readonly<Record<string, string>>
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
    }

    return (
      <InteractiveChar
        key={key}
        char={plain[relativeIndex]!}
        charKeyValue={key}
        brushColor={brushColor}
        underlineColor={underlineColor}
        onPointerDown={(event) => {
          interaction.onCharPointerDown(key, activeForStyle, event)
        }}
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
        <span key={`circle-run-${run.start}`} className="graphic-circle-highlight">
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
              vectorEffect="non-scaling-stroke"
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

    const nextStart = run?.start ?? plain.length
    while (index < nextStart) {
      parts.push(makeChar(index, false))
      index += 1
    }
  }

  return <>{parts}</>
}
