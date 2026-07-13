import { useMemo, type CSSProperties } from 'react'
import { getGraphicLayout, GRAPHIC_DISPLAY_BASE_WIDTH } from './layout'
import { buildCharHighlightSegments, themeAlpha } from './inlineHighlight'
import type { GraphicTextConfig, GraphicTextPage, MarkdownBlock } from './types'

interface GraphicPageProps {
  page: GraphicTextPage
  config: GraphicTextConfig
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
    return { fontSize: titleSize, lineHeight: config.titleLineHeight, fontWeight: 700 }
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

function edgeClasses(style: GraphicTextConfig['topStyle']) {
  if (style === 'bar') return 'bg-[var(--graphic-theme)] text-black'
  if (style === 'outline') return 'border-2 border-black bg-white/80 text-black'
  return 'bg-white/70 text-black'
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
  className = '',
  showSafeArea = false,
}: GraphicPageProps) {
  const layout = getGraphicLayout(config)
  const { percent, aspectRatio, hasTopBar, hasBottomBar } = layout
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
      {hasTopBar && (
        <div
          className={`absolute z-10 flex items-center justify-between rounded-[1.2cqw] px-[2.6cqw] ${edgeClasses(config.topStyle)}`}
          style={{
            left: `${percent.safeX}%`,
            right: `${percent.safeX}%`,
            top: `${percent.topBarTop}%`,
            height: `${percent.topBarHeight}%`,
          }}
        >
          <span className="truncate text-[2.3cqw] font-semibold">{config.topText}</span>
          <span className="rounded-full bg-black px-[1.8cqw] py-[.7cqw] text-[1.8cqw] font-semibold text-white">
            {String(page.index + 1).padStart(2, '0')}
          </span>
        </div>
      )}

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
                className={`${block.isBlockEnd ? 'mb-[1.1cqw]' : ''} ${
                  block.type === 'quote'
                    ? 'border-l-[.8cqw] border-[var(--graphic-theme)] bg-white/70 px-[2.4cqw] py-[1.3cqw]'
                    : ''
                }`}
                style={blockStyle(block, config)}
              >
                {block.type === 'list' && (
                  <span
                    className="mr-[1.5cqw] inline-block size-[1.2cqw] rounded-sm align-[.1cqw]"
                    style={{ backgroundColor: config.themeColor }}
                  />
                )}
                <HighlightedText
                  text={block.text}
                  block={block}
                  themeColor={config.themeColor}
                  highlightedKeys={highlightedKeys}
                  enableHighlight={block.type !== 'title' && block.type !== 'quote'}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {showSafeArea && <SafeAreaGuide layout={layout} />}

      {hasBottomBar && (
        <div
          className={`absolute flex items-center justify-between rounded-[1cqw] px-[2.6cqw] ${edgeClasses(config.bottomStyle)}`}
          style={{
            left: `${percent.safeX}%`,
            right: `${percent.safeX}%`,
            bottom: `${percent.footerBottom}%`,
            height: `${percent.footerHeight}%`,
          }}
        >
          <span className="truncate text-[1.8cqw]">{config.bottomText}</span>
          <span className="text-[1.8cqw] font-medium">{page.index + 1}</span>
        </div>
      )}

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
