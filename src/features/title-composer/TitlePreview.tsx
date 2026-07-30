import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { FONT_OPTIONS } from '../../data/fonts'
import { TITLE_EXPORT_WIDTH, TITLE_SAFE_X, TITLE_SAFE_X_PERCENT, toCqw } from './canvas'
import type { TitleDocument, TitleTool } from './types'

interface TitlePreviewProps {
  doc: TitleDocument
  selectedLineId: string | null
  selectedCharId: string | null
  activeTool: TitleTool
  onSelectLine: (lineId: string) => void
  onSelectChar: (lineId: string, charId: string) => void
}

export function TitlePreview({
  doc,
  selectedLineId,
  selectedCharId,
  activeTool,
  onSelectLine,
  onSelectChar,
}: TitlePreviewProps) {
  const pickChar = activeTool === 'color'
  const canvasRef = useRef<HTMLDivElement>(null)
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
        // getBoundingClientRect 含 scaleX，与最终视觉宽度一致
        if (el.getBoundingClientRect().right > safeRight + 0.5) {
          next.push(index)
        }
      })
      setOverflowLineIndexes(next)
    }

    measure()
    const canvas = canvasRef.current
    if (!canvas || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [doc])

  return (
    <div className="title-preview">
      <div className="title-preview__meta">
        <span>
          画布 {TITLE_EXPORT_WIDTH}px · 左右安全边各 {TITLE_SAFE_X}px
        </span>
        <span>字号相对整页宽（与导出一致）</span>
      </div>

      <div className="title-preview__frame" aria-label="标题预览（等比最终图片宽度）">
        {/*
          canvas = 整页宽，作为 cqw 容器（与图文 GraphicPage 一致）。
          切勿把左右安全边做成 canvas 的 padding，否则 cqw 会按「内容区」算，
          预览字偏小、看起来不溢出，导出却会超出右边。
        */}
        <div
          ref={canvasRef}
          className="title-preview__canvas"
          style={
            {
              '--title-safe-x': `${TITLE_SAFE_X_PERCENT}%`,
            } as CSSProperties
          }
        >
          <div className="title-preview__safe-guide" aria-hidden>
            <span className="title-preview__safe-label title-preview__safe-label--left">
              左 {TITLE_SAFE_X}
            </span>
            <span className="title-preview__safe-label title-preview__safe-label--right">
              右 {TITLE_SAFE_X}
            </span>
          </div>

          <div ref={safeRef} className="title-preview__safe">
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
          第 {overflowLineIndexes.map((i) => i + 1).join('、')} 行已超出右侧安全边（与最终出图一致）·
          请减小字号或拉伸
        </p>
      ) : (
        <p className="title-preview__tip">
          蓝虚线 = 文字安全区；字号按整页宽度缩放，与导出 1080 图一致
        </p>
      )}
    </div>
  )
}
