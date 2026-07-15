import { useMemo, type CSSProperties, type ReactNode } from 'react'
import {
  CODE_BACKGROUND,
  CODE_FONT_FAMILY,
  CODE_HORIZONTAL_PADDING_SCALE,
  CODE_SIZE_SCALE,
  CODE_TEXT_COLOR,
  CODE_VERTICAL_PADDING_SCALE,
} from './codeBlock'
import { getGraphicLayout, GRAPHIC_DISPLAY_BASE_WIDTH } from './layout'
import { TOP_BAR_FONT_SIZE_PX } from './graphicPreviewLayout'
import { buildCharHighlightSegments, blockHasHighlightedChar, themeAlpha } from './inlineHighlight'
import { resolveTopBarParts } from './topBar'
import type { GraphicTextConfig, GraphicTextPage, MarkdownBlock } from './types'

interface GraphicPageProps {
  page: GraphicTextPage
  config: GraphicTextConfig
  markdown: string
  className?: string
  showSafeArea?: boolean
  displayWidth?: number
}

function resolveStyleType(block: MarkdownBlock) {
  return block.styleType ?? block.type
}

type RenderUnit =
  | { kind: 'block'; block: MarkdownBlock }
  | { kind: 'code'; blocks: MarkdownBlock[] }

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

    units.push({ kind: 'block', block })
  }

  return units
}

function blockEndMargin(block: MarkdownBlock, config: GraphicTextConfig): string | undefined {
  if (!block.isBlockEnd) return undefined

  const styleType = resolveStyleType(block)
  const bodyUnit = `${(config.bodyFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const codeUnit = `${((config.bodyFontSize * CODE_SIZE_SCALE) / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
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
  return `calc(${bodyUnit} * 0.26 + ${gap})`
}

function blockStyle(block: MarkdownBlock, config: GraphicTextConfig): CSSProperties {
  const styleType = resolveStyleType(block)
  const titleSize = `${(config.titleFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const headingSize = `${(config.headingFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const bodySize = `${(config.bodyFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const codeSize = `${((config.bodyFontSize * CODE_SIZE_SCALE) / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const marginBottom = blockEndMargin(block, config)

  if (styleType === 'title') {
    return {
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
      fontSize: headingSize,
      lineHeight: config.titleLineHeight,
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
      fontSize: bodySize,
      lineHeight: config.bodyLineHeight,
      fontWeight: 700,
      marginBottom,
    }
  }
  if (styleType === 'code') {
    return {
      fontSize: codeSize,
      lineHeight: config.bodyLineHeight,
      fontWeight: 400,
      fontFamily: CODE_FONT_FAMILY,
      marginBottom,
    }
  }
  return {
    fontSize: bodySize,
    lineHeight: config.bodyLineHeight,
    fontWeight: 400,
    marginBottom,
  }
}

function HighlightedText({
  text,
  block,
  themeColor,
  highlightedKeys,
  enableHighlight,
}: {
  text: string
  block: MarkdownBlock
  themeColor: string
  highlightedKeys: ReadonlySet<string>
  enableHighlight: boolean
}) {
  if (!enableHighlight) return <>{text}</>

  const blockId = block.sourceBlockId ?? block.id
  const charOffset = block.charOffset ?? 0
  const segments = buildCharHighlightSegments(text, blockId, highlightedKeys, charOffset)

  return (
    <>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <span
            key={`${index}-${segment.text}`}
            className="graphic-theme-highlight"
            style={{
              backgroundColor: themeAlpha(themeColor, 0.28),
              textDecorationColor: themeColor,
            }}
          >
            {segment.text}
          </span>
        ) : (
          <span key={`${index}-${segment.text}`}>{segment.text}</span>
        ),
      )}
    </>
  )
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
  config: GraphicTextConfig,
  underlineKeys: ReadonlySet<string>,
  quoteKeys: ReadonlySet<string>,
) {
  const showQuoteBar = blockHasHighlightedChar(block, quoteKeys)

  const textNode = (
    <HighlightedText
      text={block.text}
      block={block}
      themeColor={config.themeColor}
      highlightedKeys={underlineKeys}
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
    return showQuoteBar ? (
      <QuoteHighlightBar themeColor={config.themeColor}>{listContent}</QuoteHighlightBar>
    ) : (
      listContent
    )
  }

  return showQuoteBar ? (
    <QuoteHighlightBar themeColor={config.themeColor}>{textNode}</QuoteHighlightBar>
  ) : (
    textNode
  )
}

function SafeAreaGuide({
  layout,
}: {
  layout: ReturnType<typeof getGraphicLayout>
}) {
  const { percent } = layout

  return (
    <div
      className="graphic-safe-area-guide pointer-events-none absolute z-20"
      style={{
        left: `${percent.safeX}%`,
        right: `${percent.safeX}%`,
        top: `${percent.safeTop}%`,
        bottom: `${percent.contentBottom}%`,
      }}
      aria-hidden
    >
      <div className="absolute inset-0 border-2 border-dashed border-sky-500/85" />
      <span className="absolute left-[1.2cqw] top-[1.2cqw] rounded bg-sky-500/90 px-[1.4cqw] py-[.5cqw] text-[1.8cqw] font-medium text-white">
        文字安全区
      </span>
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
}: GraphicPageProps) {
  const layout = getGraphicLayout(config)
  const { percent, aspectRatio } = layout
  const topBar = resolveTopBarParts(config, markdown)
  const underlineKeys = useMemo(
    () => new Set(config.underlineHighlightedCharKeys),
    [config.underlineHighlightedCharKeys],
  )
  const quoteKeys = useMemo(
    () => new Set(config.quoteHighlightedCharKeys),
    [config.quoteHighlightedCharKeys],
  )

  const backgroundStyle: CSSProperties =
    config.template === 'reference' && config.backgroundUrl
      ? {
          backgroundImage: `linear-gradient(rgba(255,255,255,.82), rgba(255,255,255,.82)), url("${config.backgroundUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : config.template === 'solid'
        ? { backgroundColor: config.paperColor }
        : config.template === 'grid'
        ? {
            backgroundColor: '#FBF7ED',
            backgroundImage:
              'linear-gradient(rgba(23,23,23,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(23,23,23,.055) 1px, transparent 1px)',
            backgroundSize: '3.2cqw 3.2cqw',
          }
        : { backgroundColor: '#FBF7ED' }

  return (
    <article
      className={`graphic-page relative isolate overflow-hidden bg-[#fbf7ed] text-neutral-950 ${className}`}
      style={
        {
          ...backgroundStyle,
          width: displayWidth ? `${displayWidth}px` : '100%',
          aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}`,
          '--graphic-theme': config.themeColor,
          fontFamily: config.fontFamily,
          containerType: 'inline-size',
        } as CSSProperties
      }
    >
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
        className="absolute overflow-hidden"
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
              if (unit.kind === 'code') {
                const firstBlock = unit.blocks[0]
                const lastBlock = unit.blocks[unit.blocks.length - 1]
                const codeSize = `${((config.bodyFontSize * CODE_SIZE_SCALE) / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
                return (
                  <div
                    key={firstBlock.id}
                    style={{
                      marginBottom: blockEndMargin(lastBlock, config),
                    }}
                  >
                    <div
                      className="overflow-hidden rounded-[1.2cqw]"
                      style={{
                        backgroundColor: CODE_BACKGROUND,
                        padding: `calc(${codeSize} * ${CODE_VERTICAL_PADDING_SCALE}) calc(${codeSize} * ${CODE_HORIZONTAL_PADDING_SCALE})`,
                        fontFamily: CODE_FONT_FAMILY,
                        fontSize: codeSize,
                        lineHeight: config.bodyLineHeight,
                        color: CODE_TEXT_COLOR,
                      }}
                    >
                      {unit.blocks.map((block) => (
                        <div key={block.id} className="whitespace-pre">
                          <HighlightedText
                            text={block.text}
                            block={block}
                            themeColor={config.themeColor}
                            highlightedKeys={underlineKeys}
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
              <div key={block.id} style={blockStyle(block, config)}>
                {renderBlockText(block, config, underlineKeys, quoteKeys)}
              </div>
              )
            })
          )}
        </div>
      </div>

      {showSafeArea && <SafeAreaGuide layout={layout} />}

      <div
        className="absolute left-[3.2%] top-[3.2%] size-[1.5cqw] bg-[var(--graphic-theme)]"
        aria-hidden
      />
    </article>
  )
}
