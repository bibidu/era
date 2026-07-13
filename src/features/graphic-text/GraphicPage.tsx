import type { CSSProperties } from 'react'
import { GRAPHIC_DISPLAY_BASE_WIDTH } from './layout'
import type { GraphicTextConfig, GraphicTextPage, MarkdownBlock } from './types'

interface GraphicPageProps {
  page: GraphicTextPage
  config: GraphicTextConfig
  className?: string
}

function blockStyle(block: MarkdownBlock, config: GraphicTextConfig): CSSProperties {
  const titleSize = `${(config.titleFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`
  const bodySize = `${(config.bodyFontSize / GRAPHIC_DISPLAY_BASE_WIDTH) * 100}cqw`

  if (block.type === 'title') {
    return { fontSize: titleSize, lineHeight: 1.22, fontWeight: 700 }
  }
  if (block.type === 'heading') {
    return {
      fontSize: `calc(${titleSize} * .72)`,
      lineHeight: 1.35,
      fontWeight: 700,
      marginTop: '1.2cqw',
    }
  }
  return { fontSize: bodySize, lineHeight: 1.55, fontWeight: 400 }
}

function edgeClasses(style: GraphicTextConfig['topStyle']) {
  if (style === 'bar') return 'bg-[var(--graphic-theme)] text-black'
  if (style === 'outline') return 'border-2 border-black bg-white/80 text-black'
  return 'bg-white/70 text-black'
}

export function GraphicPage({ page, config, className = '' }: GraphicPageProps) {
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
      className={`graphic-page relative isolate aspect-[3/4] w-full overflow-hidden bg-[#fbf7ed] text-neutral-950 ${className}`}
      style={
        {
          ...backgroundStyle,
          '--graphic-theme': config.themeColor,
          fontFamily: config.fontFamily,
          containerType: 'inline-size',
        } as CSSProperties
      }
    >
      <div
        className={`absolute inset-x-[8.9%] top-[4.2%] z-10 flex h-[6.8%] items-center justify-between rounded-[1.2cqw] px-[2.6cqw] ${edgeClasses(config.topStyle)}`}
      >
        <span className="truncate text-[2.3cqw] font-semibold">{config.topText || '图文笔记'}</span>
        <span className="rounded-full bg-black px-[1.8cqw] py-[.7cqw] text-[1.8cqw] font-semibold text-white">
          {String(page.index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="absolute inset-x-[8.9%] bottom-[11.8%] top-[12.5%] overflow-hidden">
        <div className="flex h-full flex-col justify-start gap-[1.1cqw]">
          {page.blocks.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-[3cqw] text-neutral-400">
              输入 Markdown 内容后生成
            </div>
          ) : (
            page.blocks.map((block) => (
              <div
                key={block.id}
                className={
                  block.type === 'quote'
                    ? 'border-l-[.8cqw] border-[var(--graphic-theme)] bg-white/70 px-[2.4cqw] py-[1.3cqw]'
                    : ''
                }
                style={blockStyle(block, config)}
              >
                {block.type === 'list' && (
                  <span
                    className="mr-[1.5cqw] inline-block size-[1.2cqw] rounded-sm align-[.1cqw]"
                    style={{ backgroundColor: config.themeColor }}
                  />
                )}
                {block.text}
              </div>
            ))
          )}
        </div>
      </div>

      <div
        className={`absolute inset-x-[8.9%] bottom-[4.2%] flex h-[5%] items-center justify-between rounded-[1cqw] px-[2.6cqw] ${edgeClasses(config.bottomStyle)}`}
      >
        <span className="truncate text-[1.8cqw]">{config.bottomText || '滑动查看下一页'}</span>
        <span className="text-[1.8cqw] font-medium">
          {page.index + 1}
        </span>
      </div>

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
