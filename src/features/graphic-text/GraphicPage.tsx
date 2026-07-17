import { type CSSProperties, type ReactNode } from 'react'
import {
  CODE_BORDER_COLOR,
  CODE_HORIZONTAL_PADDING_SCALE,
  CODE_TEXT_COLOR,
  CODE_VERTICAL_PADDING_SCALE,
} from './codeBlock'
import { HandDrawnUnderline } from './HandDrawnUnderline'
import { getGraphicLayout, GRAPHIC_DISPLAY_BASE_WIDTH } from './layout'
import { getFontConfigForStyleType } from './graphicTextFonts'
import { TOP_BAR_FONT_SIZE_PX } from './graphicPreviewLayout'
import {
  buildCircleHighlightColorRuns,
  HAND_DRAWN_CIRCLE_PATH,
  HAND_DRAWN_CIRCLE_VIEWBOX,
} from './circleHighlight'
import { buildHandUnderlineColorRuns } from './handDrawnUnderline'
import {
  buildMergedThemeHighlightSegments,
  stripHighlightMarkers,
  themeAlpha,
} from './inlineHighlight'
import {
  blockHasHighlightInMap,
  resolveBlockHighlightColor,
} from './highlightColors'
import { resolvePageBackgroundStyle } from './pageBackground'
import { PageGradientOverlay } from './PageGradientOverlay'
import { PagePixelOverlay } from './PagePixelOverlay'
import { shouldDrawPageOverlay } from './pageLayering'
import { resolveTopBarParts } from './topBar'
import type { GraphicTextConfig, GraphicTextPage, MarkdownBlock } from './types'

interface GraphicPageProps {
  page: GraphicTextPage
  config: GraphicTextConfig
  markdown: string
  className?: string
  showSafeArea?: boolean
  displayWidth?: number
  onCopyContent?: () => void
}

function resolveStyleType(block: MarkdownBlock) {
  return block.styleType ?? block.type
}

type RenderUnit =
  | { kind: 'block'; block: MarkdownBlock }
  | { kind: 'code'; blocks: MarkdownBlock[] }
  | { kind: 'image'; block: MarkdownBlock }

function buildRenderUnits(blocks: MarkdownBlock[]): RenderUnit[] {
  const units: RenderUnit[] = []

  for (const block of blocks) {
    const styleType = resolveStyleType(block)

    if (styleType === 'code') {
      const sourceId = block.sourceBlockId ?? block.id
      const last = units[units.length - 1]
      if (
        last?.kind === 'code' &&
        (last.blocks[0].sourceBlockId ?? last.blocks[0].id) === sourceId
      ) {
        last.blocks.push(block)
      } else {
        units.push({ kind: 'code', blocks: [block] })
      }
      continue
    }

    if (styleType === 'image') {
      units.push({ kind: 'image', block })
      continue
    }

    units.push({ kind: 'block', block })
  }

  return units
}

function blockEndMargin(block: MarkdownBlock, config: GraphicTextConfig): string | undefined {
  if (!block.isBlockEnd) return undefined

  const styleType = resolveStyleType(block)
  const bodyUnit = `${(config.bodyFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const codeUnit = `${(config.codeFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const titleUnit = `${(config.titleFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const headingUnit = `${(config.headingFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const gap = '1.1cqw'

  if (styleType === 'title') {
    return `calc(${titleUnit} * ${config.titleMarginBottom + 0.18} + ${gap})`
  }
  if (styleType === 'heading') {
    return `calc(${headingUnit} * ${config.headingMarginBottom + 0.18} + ${gap})`
  }
  if (styleType === 'code') {
    return `calc(${codeUnit} * 0.26 + ${gap})`
  }
  if (styleType === 'image') {
    return `calc(${bodyUnit} * 0.26 + ${gap})`
  }
  return `calc(${bodyUnit} * 0.26 + ${gap})`
}

function blockStyle(block: MarkdownBlock, config: GraphicTextConfig): CSSProperties {
  const styleType = resolveStyleType(block)
  const { fontFamily } = getFontConfigForStyleType(config, styleType)
  const titleSize = `${(config.titleFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const headingSize = `${(config.headingFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const bodySize = `${(config.bodyFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const codeSize = `${(config.codeFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const marginBottom = blockEndMargin(block, config)

  if (styleType === 'title') {
    return {
      fontFamily,
      fontSize: titleSize,
      lineHeight: config.titleLineHeight,
      fontWeight: 700,
      marginTop:
        block.type === 'title' ? `calc(${titleSize} * ${config.titleMarginTop})` : undefined,
      marginBottom,
    }
  }
  if (styleType === 'heading') {
    return {
      fontFamily,
      fontSize: headingSize,
      lineHeight: config.headingLineHeight,
      fontWeight: 700,
      marginTop:
        block.type === 'heading'
          ? `calc(${headingSize} * ${config.headingMarginTop})`
          : undefined,
      marginBottom,
    }
  }
  if (styleType === 'quote') {
    return {
      fontFamily,
      fontSize: bodySize,
      lineHeight: config.bodyLineHeight,
      fontWeight: 700,
      marginBottom,
    }
  }
  if (styleType === 'code') {
    return {
      fontSize: codeSize,
      lineHeight: config.codeLineHeight,
      fontWeight: 400,
      fontFamily: config.codeFontFamily,
      marginBottom,
    }
  }
  return {
    fontFamily,
    fontSize: bodySize,
    lineHeight: config.bodyLineHeight,
    fontWeight: 400,
    marginBottom,
  }
}

function BrushUnderlineSegments({
  text,
  blockId,
  charOffset,
  brushColors,
  underlineColors,
}: {
  text: string
  blockId: string
  charOffset: number
  brushColors: Readonly<Record<string, string>>
  underlineColors: Readonly<Record<string, string>>
}) {
  const segments = buildMergedThemeHighlightSegments(
    text,
    blockId,
    brushColors,
    underlineColors,
    {},
    charOffset,
  )

  return (
    <>
      {segments.map((segment, index) => {
        if (!segment.brushColor && !segment.underlineColor) {
          return <span key={`${index}-${segment.text}`}>{segment.text}</span>
        }

        return (
          <span
            key={`${index}-${segment.text}`}
            className={[
              segment.brushColor ? 'graphic-theme-brush' : '',
              segment.underlineColor ? 'graphic-theme-underline' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              ...(segment.brushColor
                ? { backgroundColor: themeAlpha(segment.brushColor, 0.28) }
                : null),
              ...(segment.underlineColor
                ? { ['--graphic-highlight-underline' as string]: segment.underlineColor }
                : null),
            }}
          >
            {segment.text}
          </span>
        )
      })}
    </>
  )
}

function HandUnderlineAwareSegments({
  text,
  blockId,
  charOffset,
  brushColors,
  underlineColors,
  handUnderlineColors,
}: {
  text: string
  blockId: string
  charOffset: number
  brushColors: Readonly<Record<string, string>>
  underlineColors: Readonly<Record<string, string>>
  handUnderlineColors: Readonly<Record<string, string>>
}) {
  const plain = stripHighlightMarkers(text)
  const handRuns = buildHandUnderlineColorRuns(plain, blockId, charOffset, handUnderlineColors)

  if (!handRuns.length) {
    return (
      <BrushUnderlineSegments
        text={text}
        blockId={blockId}
        charOffset={charOffset}
        brushColors={brushColors}
        underlineColors={underlineColors}
      />
    )
  }

  const parts: ReactNode[] = []
  let index = 0
  let runCursor = 0

  while (index < plain.length) {
    const run = handRuns[runCursor]
    if (run && index === run.start) {
      parts.push(
        <HandDrawnUnderline key={`hand-${index}`} color={run.color}>
          <BrushUnderlineSegments
            text={run.text}
            blockId={blockId}
            charOffset={charOffset + run.start}
            brushColors={brushColors}
            underlineColors={underlineColors}
          />
        </HandDrawnUnderline>,
      )
      index = run.end
      runCursor += 1
      continue
    }

    const nextHandStart = run?.start ?? plain.length
    const end = Math.min(nextHandStart, plain.length)
    parts.push(
      <BrushUnderlineSegments
        key={`plain-${index}`}
        text={plain.slice(index, end)}
        blockId={blockId}
        charOffset={charOffset + index}
        brushColors={brushColors}
        underlineColors={underlineColors}
      />,
    )
    index = end
  }

  return <>{parts}</>
}

function CircleHighlightWrap({
  themeColor,
  children,
}: {
  themeColor: string
  children: ReactNode
}) {
  return (
    <span className="graphic-circle-highlight">
      <span className="graphic-circle-highlight-text">{children}</span>
      <svg
        className="graphic-circle-highlight-svg"
        viewBox={HAND_DRAWN_CIRCLE_VIEWBOX}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={HAND_DRAWN_CIRCLE_PATH}
          fill="none"
          stroke={themeColor}
          strokeWidth={4}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function StyledHighlightedText({
  text,
  block,
  brushColors,
  underlineColors,
  handUnderlineColors,
  circleColors,
  enableHighlight,
}: {
  text: string
  block: MarkdownBlock
  brushColors: Readonly<Record<string, string>>
  underlineColors: Readonly<Record<string, string>>
  handUnderlineColors: Readonly<Record<string, string>>
  circleColors: Readonly<Record<string, string>>
  enableHighlight: boolean
}) {
  if (!enableHighlight) return <>{text}</>

  const blockId = block.sourceBlockId ?? block.id
  const charOffset = block.charOffset ?? 0
  const plain = stripHighlightMarkers(text)
  const circleRuns = buildCircleHighlightColorRuns(plain, blockId, charOffset, circleColors)
  const parts: ReactNode[] = []
  let index = 0
  let runCursor = 0

  while (index < plain.length) {
    const run = circleRuns[runCursor]
    if (run && index === run.start) {
      parts.push(
        <CircleHighlightWrap key={`circle-${index}`} themeColor={run.color}>
          <HandUnderlineAwareSegments
            text={run.text}
            blockId={blockId}
            charOffset={charOffset + run.start}
            brushColors={brushColors}
            underlineColors={underlineColors}
            handUnderlineColors={handUnderlineColors}
          />
        </CircleHighlightWrap>,
      )
      index = run.end
      runCursor += 1
      continue
    }

    const nextCircleStart = run?.start ?? plain.length
    const end = Math.min(nextCircleStart, plain.length)
    parts.push(
      <HandUnderlineAwareSegments
        key={`text-${index}`}
        text={plain.slice(index, end)}
        blockId={blockId}
        charOffset={charOffset + index}
        brushColors={brushColors}
        underlineColors={underlineColors}
        handUnderlineColors={handUnderlineColors}
      />,
    )
    index = end
  }

  return <>{parts}</>
}

function QuoteHighlightBar({
  themeColor,
  children,
}: {
  themeColor: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-[1.5cqw]">
      <span
        className="w-[0.9cqw] shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: themeColor }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function renderBlockText(
  block: MarkdownBlock,
  brushColors: Readonly<Record<string, string>>,
  underlineColors: Readonly<Record<string, string>>,
  handUnderlineColors: Readonly<Record<string, string>>,
  quoteColors: Readonly<Record<string, string>>,
  circleColors: Readonly<Record<string, string>>,
) {
  const showQuoteBar = blockHasHighlightInMap(block, quoteColors)
  const quoteColor = resolveBlockHighlightColor(block, quoteColors)

  const textNode = (
    <StyledHighlightedText
      text={block.text}
      block={block}
      brushColors={brushColors}
      underlineColors={underlineColors}
      handUnderlineColors={handUnderlineColors}
      circleColors={circleColors}
      enableHighlight
    />
  )

  if (block.type === 'list') {
    const listContent = (
      <div className="flex gap-[1.5cqw]">
        <span
          className="flex h-[1lh] w-[0.7em] shrink-0 items-center justify-center"
          aria-hidden
        >
          <span className="size-[0.32em] rounded-full bg-neutral-800" />
        </span>
        <span className="min-w-0 flex-1">{textNode}</span>
      </div>
    )
    return showQuoteBar && quoteColor ? (
      <QuoteHighlightBar themeColor={quoteColor}>{listContent}</QuoteHighlightBar>
    ) : (
      listContent
    )
  }

  return showQuoteBar && quoteColor ? (
    <QuoteHighlightBar themeColor={quoteColor}>{textNode}</QuoteHighlightBar>
  ) : (
    textNode
  )
}

function SafeAreaGuide({
  layout,
  onCopyContent,
}: {
  layout: ReturnType<typeof getGraphicLayout>
  onCopyContent?: () => void
}) {
  const { percent } = layout

  return (
    <div
      className="graphic-safe-area-guide absolute z-20"
      style={{
        left: `${percent.safeX}%`,
        right: `${percent.safeX}%`,
        top: `${percent.safeTop}%`,
        bottom: `${percent.contentBottom}%`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-sky-500/85" />
      <span className="pointer-events-none absolute left-[1.2cqw] top-[1.2cqw] rounded bg-sky-500/90 px-[1.4cqw] py-[.5cqw] text-[1.8cqw] font-medium text-white">
        文字安全区
      </span>
      {onCopyContent && (
        <button
          type="button"
          className="graphic-safe-area-copy"
          onClick={onCopyContent}
        >
          复制
        </button>
      )}
      <span className="graphic-safe-area-corner left-0 top-0" />
      <span className="graphic-safe-area-corner right-0 top-0" />
      <span className="graphic-safe-area-corner bottom-0 left-0" />
      <span className="graphic-safe-area-corner bottom-0 right-0" />
    </div>
  )
}

export function GraphicPage({
  page,
  config,
  markdown,
  className = '',
  showSafeArea = false,
  displayWidth,
  onCopyContent,
}: GraphicPageProps) {
  const layout = getGraphicLayout(config)
  const { percent, aspectRatio } = layout
  const topBar = resolveTopBarParts(config, markdown)
  const brushColors = config.brushHighlightColors ?? {}
  const underlineColors = config.underlineHighlightColors
  const handUnderlineColors = config.handUnderlineHighlightColors ?? {}
  const quoteColors = config.quoteHighlightColors
  const circleColors = config.circleHighlightColors
  const accentColor = config.highlightPickerColor

  const backgroundStyle: CSSProperties = resolvePageBackgroundStyle(config)

  return (
    <article
      className={`graphic-page relative isolate overflow-hidden bg-[#fbf7ed] text-neutral-950 ${className}`}
      style={
        {
          ...backgroundStyle,
          width: displayWidth ? `${displayWidth}px` : '100%',
          aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}`,
          '--graphic-theme': accentColor,
          fontFamily: config.bodyFontFamily,
          containerType: 'inline-size',
        } as CSSProperties
      }
    >
      {shouldDrawPageOverlay(config) && config.pageOverlay === 'pixel' && (
        <PagePixelOverlay stacked={config.overlayStacked} />
      )}
      {shouldDrawPageOverlay(config) &&
        config.pageOverlay === 'gradient' &&
        config.overlayStacked && <PageGradientOverlay />}

      <div
        className="absolute z-10 flex min-w-0 items-center gap-2 border-b border-neutral-300"
        style={{
          left: `${percent.safeX}%`,
          right: `${percent.safeX}%`,
          top: `${percent.topBarTop}%`,
          height: `${percent.topBarHeight}%`,
          paddingBottom: '6px',
        }}
      >
        {topBar.custom ? (
          <>
            <span
              className="min-w-0 truncate font-normal text-neutral-600"
              style={{ fontSize: `${TOP_BAR_FONT_SIZE_PX}px` }}
            >
              {topBar.custom}
            </span>
            <span
              className="h-3 w-px shrink-0 self-center bg-neutral-300"
              aria-hidden
            />
            <span
              className="shrink-0 font-normal text-neutral-600"
              style={{ fontSize: `${TOP_BAR_FONT_SIZE_PX}px` }}
            >
              {topBar.countText}
            </span>
          </>
        ) : (
          <span
            className="truncate font-normal text-neutral-600"
            style={{ fontSize: `${TOP_BAR_FONT_SIZE_PX}px` }}
          >
            {topBar.countText}
          </span>
        )}
      </div>

      <div
        className="absolute z-10 overflow-visible"
        style={{
          left: `${percent.safeX}%`,
          right: `${percent.safeX}%`,
          top: `${percent.safeTop}%`,
          bottom: `${percent.contentBottom}%`,
        }}
      >
        <div className="flex h-full flex-col justify-start">
          {page.blocks.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-[3cqw] text-neutral-400">
              输入 Markdown 内容后生成
            </div>
          ) : (
            buildRenderUnits(page.blocks).map((unit) => {
              if (unit.kind === 'image') {
                const block = unit.block
                const contentWidth = layout.pageWidth - layout.safeX * 2
                const widthPercent = block.imageWidth
                  ? Math.min(100, (block.imageWidth / contentWidth) * 100)
                  : 100
                return (
                  <div
                    key={block.id}
                    className="graphic-content-image-wrap"
                    style={{
                      marginBottom: blockEndMargin(block, config),
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      className="graphic-content-image"
                      src={block.imageUrl}
                      alt=""
                      style={{ width: `${widthPercent}%`, height: 'auto', display: 'block' }}
                    />
                  </div>
                )
              }

              if (unit.kind === 'code') {
                const firstBlock = unit.blocks[0]
                const lastBlock = unit.blocks[unit.blocks.length - 1]
                const codeSize = `${(config.codeFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
                return (
                  <div
                    key={firstBlock.id}
                    style={{
                      marginBottom: blockEndMargin(lastBlock, config),
                    }}
                  >
                    <div
                      className="graphic-code-block"
                      style={{
                        backgroundColor: config.codeBackgroundColor,
                        borderColor: CODE_BORDER_COLOR,
                        padding: `calc(${codeSize} * ${CODE_VERTICAL_PADDING_SCALE}) calc(${codeSize} * ${CODE_HORIZONTAL_PADDING_SCALE})`,
                        fontFamily: config.codeFontFamily,
                        fontSize: codeSize,
                        lineHeight: config.codeLineHeight,
                        color: CODE_TEXT_COLOR,
                      }}
                    >
                      {unit.blocks.map((block) => (
                        <div key={block.id} className="whitespace-pre">
                          <StyledHighlightedText
                            text={block.text}
                            block={block}
                            brushColors={brushColors}
                            underlineColors={underlineColors}
                            handUnderlineColors={handUnderlineColors}
                            circleColors={circleColors}
                            enableHighlight
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }

              const block = unit.block
              return (
              <div key={block.id} className="graphic-text-line" style={blockStyle(block, config)}>
                {renderBlockText(block, brushColors, underlineColors, handUnderlineColors, quoteColors, circleColors)}
              </div>
              )
            })
          )}
        </div>
      </div>

      {showSafeArea && (
        <SafeAreaGuide layout={layout} onCopyContent={onCopyContent} />
      )}

      <div
        className="absolute left-[3.2%] top-[3.2%] size-[1.5cqw] bg-[var(--graphic-theme)]"
        aria-hidden
      />
    </article>
  )
}
