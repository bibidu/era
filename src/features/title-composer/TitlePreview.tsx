import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { FONT_OPTIONS } from '../../data/fonts'
import {
  getTitlePageLayout,
  TITLE_DEFAULT_ASPECT,
  TITLE_EXPORT_WIDTH,
  TITLE_SAFE_X,
  toCqw,
} from './canvas'
import type { TitleDocument, TitleTool } from './types'

interface TitlePreviewProps {
  doc: TitleDocument
  selectedLineId: string | null
  selectedCharId: string | null
  activeTool: TitleTool
  onSelectLine: (lineId: string) => void
  onSelectChar: (lineId: string, charId: string) => void
}

/**
 * 整页 9:16 预览：宽高比、安全边、顶栏、标题起点与最终出图同一套 getGraphicLayout。
 * 蓝虚线框 = 文字安全区（最终图里标题所在的那一列宽度与位置）。
 */
export function TitlePreview({
  doc,
  selectedLineId,
  selectedCharId,
  activeTool,
  onSelectLine,
  onSelectChar,
}: TitlePreviewProps) {
  const pickChar = activeTool === 'color'
  const layout = useMemo(() => getTitlePageLayout(TITLE_DEFAULT_ASPECT), [])
  const pageRef = useRef<HTMLDivElement>(null)
  const safeRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [overflowLineIndexes, setOverflowLineIndexes] = useState<number[]>([])

  useLayoutEffect(() => {
    const measure = () => {
      const safe = safeRef.current
      if (!safe) {
        setOverflowLineIndexes([])
        return
      }
      const safeRight = safe.getBoundingClientRect().right
      const next: number[] = []
      doc.lines.forEach((line, index) => {
        const el = lineRefs.current[line.id]
        if (!el) return
        if (el.getBoundingClientRect().right > safeRight + 0.5) next.push(index)
      })
      setOverflowLineIndexes(next)
    }

    measure()
    const page = pageRef.current
    if (!page || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(page)
    return () => ro.disconnect()
  }, [doc])

  const pageStyle = {
    '--title-safe-x': `${layout.percent.safeX}%`,
    '--title-safe-top': `${layout.percent.safeTop}%`,
    '--title-safe-bottom': `${layout.percent.contentBottom}%`,
    '--title-topbar-top': `${layout.percent.topBarTop}%`,
    '--title-topbar-height': `${layout.percent.topBarHeight}%`,
    aspectRatio: `${layout.aspectRatio.width} / ${layout.aspectRatio.height}`,
  } as CSSProperties

  return (
    <div className="title-preview">
      <div className="title-preview__frame">
        <div
          ref={pageRef}
          className="title-preview__page"
          style={pageStyle}
          aria-label="完整页面预览（与导出同布局）"
        >
          <div className="title-preview__topbar" aria-hidden>
            <span>连续观看、点赞、关注，你也是地理风水达人（阳宅篇）</span>
          </div>

          {/* 蓝虚线：最终图文字安全区的精确宽与位置 */}
          <div ref={safeRef} className="title-preview__safe" aria-hidden={false}>
            <div className="title-preview__safe-guide" aria-hidden>
              <span className="title-preview__safe-label">文字安全区</span>
            </div>

            <div className="title-preview__stack">
              {doc.lines.map((line, index) => {
                const font = FONT_OPTIONS.find((f) => f.id === line.fontId) ?? FONT_OPTIONS[0]
                const selected = line.id === selectedLineId
                const overflow = overflowLineIndexes.includes(index)
                const style: CSSProperties = {
                  fontFamily: font.fontFamily,
                  fontSize: toCqw(line.fontSize),
                  color: line.color,
                  transform: `scaleX(${line.stretch})`,
                  transformOrigin: 'left center',
                  marginBottom:
                    index < doc.lines.length - 1 ? toCqw(line.gapAfter) : 0,
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: line.stretch > 1.2 ? '-0.02em' : '0',
                }

                return (
                  <div
                    key={line.id}
                    ref={(el) => {
                      lineRefs.current[line.id] = el
                    }}
                    role="button"
                    tabIndex={0}
                    className={`title-preview__line ${selected ? 'is-selected' : ''} ${
                      overflow ? 'is-overflow' : ''
                    }`}
                    style={style}
                    onClick={() => onSelectLine(line.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectLine(line.id)
                      }
                    }}
                  >
                    {line.chars.map((char) => {
                      const charColor = char.color ?? line.color
                      const charSelected = char.id === selectedCharId && selected
                      return (
                        <span
                          key={char.id}
                          className={`title-preview__char ${pickChar ? 'is-tappable' : ''} ${
                            char.color ? 'is-accent' : ''
                          } ${charSelected ? 'is-char-selected' : ''}`}
                          style={{ color: charColor }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectLine(line.id)
                            onSelectChar(line.id, char.id)
                          }}
                        >
                          {char.ch}
                        </span>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {overflowLineIndexes.length > 0 ? (
        <p className="title-preview__warn">
          第 {overflowLineIndexes.map((i) => i + 1).join('、')} 行超出安全区右边
        </p>
      ) : (
        <p className="title-preview__tip">
          {TITLE_EXPORT_WIDTH}×{layout.pageHeight} · 安全区宽 {layout.pageWidth - TITLE_SAFE_X * 2}
          px · 拖底部面板边缘可放大预览
        </p>
      )}
    </div>
  )
}
