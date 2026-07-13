import { useMemo, type CSSProperties } from 'react'
import { getGraphicLayout, GRAPHIC_DISPLAY_BASE_WIDTH } from './layout'
import { buildCharHighlightSegments, themeAlpha } from './inlineHighlight'
import { resolveTopBarText } from './topBar'
import type { GraphicTextConfig, GraphicTextPage, MarkdownBlock } from './types'

interface GraphicPageProps {
  page: GraphicTextPage
  config: GraphicTextConfig
  markdown: string
  className?: string
  showSafeArea?: boolean
}

function resolveStyleType(block: MarkdownBlock) {
  return block.styleType ?? block.type
}

function blockStyle(block: MarkdownBlock, config: GraphicTextConfig): CSSProperties {
  const styleType = resolveStyleType(block)
  const titleSize = `${(config.titleFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const bodySize = `${(config.bodyFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`

  if (styleType === 'title') {
    const marginUnit = `${((config.titleFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100).toFixed(2)}cqw`
    return {
      fontSize: titleSize,
      lineHeight: config.titleLineHeight,
      fontWeight: 700,
      marginTop: block.type === 'title' ? `calc(${marginUnit} * ${config.titleMarginTop})` : undefined,
      marginBottom: block.isBlockEnd
        ? `calc(${marginUnit} * ${config.titleMarginBottom})`
        : undefined,
    }
  }
  if (styleType === 'heading') {
    return {
      fontSize: `calc(${titleSize} * .72)`,
      lineHeight: config.titleLineHeight,
      fontWeight: 700,
      marginTop: block.type === 'heading' ? '1.2cqw' : undefined,
    }
  }
  return { fontSize: bodySize, lineHeight: config.bodyLineHeight, fontWeight: 400 }
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
}: GraphicPageProps) {
  const layout = getGraphicLayout(config)
  const { percent, aspectRatio } = layout
  const topBarText = resolveTopBarText(config, markdown)
  const highlightedKeys = useMemo(
    () => new Set(config.highlightedCharKeys),
    [config.highlightedCharKeys],
  )

  const backgroundStyle: CSSProperties =
    config.template === 'reference' && config.backgroundUrl
      ? {
          backgroundImage: `linear-gradient(rgba(255,255,255,.82), rgba(255,255,255,.82)), url("${config.backgroundUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
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
      className={`graphic-page relative isolate w-full overflow-hidden bg-[#fbf7ed] text-neutral-950 ${className}`}
      style={
        {
          ...backgroundStyle,
          aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}`,
          '--graphic-theme': config.themeColor,
          fontFamily: config.fontFamily,
          containerType: 'inline-size',
        } as CSSProperties
      }
    >
      <div
        className="absolute z-10 flex items-end border-b border-neutral-300"
        style={{
          left: `${percent.safeX}%`,
          right: `${percent.safeX}%`,
          top: `${percent.topBarTop}%`,
          height: `${percent.topBarHeight}%`,
          paddingBottom: '0.8cqw',
        }}
      >
        <span className="truncate text-[2.1cqw] font-normal text-neutral-600">{topBarText}</span>
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
            page.blocks.map((block) => (
              <div
                key={block.id}
                className={block.isBlockEnd ? 'mb-[1.1cqw]' : ''}
                style={blockStyle(block, config)}
              >
                <HighlightedText
                  text={block.text}
                  block={block}
                  themeColor={config.themeColor}
                  highlightedKeys={highlightedKeys}
                  enableHighlight={block.type !== 'title'}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {showSafeArea && <SafeAreaGuide layout={layout} />}

      <div
        className="absolute left-[3.2%] top-[3.2%] size-[1.5cqw] bg-[var(--graphic-theme)]"
        aria-hidden
      />
      <div className="absolute bottom-[3.2%] right-[3.2%] flex gap-[.7cqw]" aria-hidden>
        <span className="size-[.9cqw] bg-black" />
        <span className="size-[.9cqw] bg-[var(--graphic-theme)]" />
      </div>
    </article>
  )
}
