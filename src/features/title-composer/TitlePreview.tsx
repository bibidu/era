import type { CSSProperties } from 'react'
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

  return (
    <div className="title-preview">
      <div className="title-preview__meta">
        <span>
          画布 {TITLE_EXPORT_WIDTH}px · 左右安全边各 {TITLE_SAFE_X}px
        </span>
        <span>与最终出图同宽比例</span>
      </div>

      <div className="title-preview__frame" aria-label="标题预览（等比最终图片宽度）">
        <div
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

          <div className="title-preview__stack">
            {doc.lines.map((line, index) => {
              const font = FONT_OPTIONS.find((f) => f.id === line.fontId) ?? FONT_OPTIONS[0]
              const selected = line.id === selectedLineId
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
                  role="button"
                  tabIndex={0}
                  className={`title-preview__line ${selected ? 'is-selected' : ''}`}
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

      <p className="title-preview__tip">
        虚线内为文字安全区；看右侧是否顶边，即可判断左右留白是否一致
      </p>
    </div>
  )
}
