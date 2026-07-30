import type { CSSProperties } from 'react'
import { FONT_OPTIONS } from '../../data/fonts'
import type { TitleDocument, TitleTool } from './types'

interface TitlePreviewProps {
  doc: TitleDocument
  selectedLineId: string | null
  activeTool: TitleTool
  accentColor: string
  onSelectLine: (lineId: string) => void
  onToggleChar: (lineId: string, charId: string) => void
}

export function TitlePreview({
  doc,
  selectedLineId,
  activeTool,
  accentColor,
  onSelectLine,
  onToggleChar,
}: TitlePreviewProps) {
  const colorMode = activeTool === 'color'

  return (
    <div className="title-preview">
      <div className="title-preview__canvas" aria-label="标题预览">
        <div className="title-preview__stack">
          {doc.lines.map((line, index) => {
            const font = FONT_OPTIONS.find((f) => f.id === line.fontId) ?? FONT_OPTIONS[0]
            const selected = line.id === selectedLineId
            const style: CSSProperties = {
              fontFamily: font.fontFamily,
              fontSize: `${line.fontSize}px`,
              color: line.color,
              transform: `scaleX(${line.stretch})`,
              transformOrigin: 'left center',
              marginBottom: index < doc.lines.length - 1 ? `${line.gapAfter}px` : 0,
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
                  const isAccent = Boolean(char.color)
                  return (
                    <span
                      key={char.id}
                      className={`title-preview__char ${colorMode ? 'is-tappable' : ''} ${
                        isAccent ? 'is-accent' : ''
                      }`}
                      style={{ color: charColor }}
                      onClick={(e) => {
                        if (!colorMode) return
                        e.stopPropagation()
                        onSelectLine(line.id)
                        onToggleChar(line.id, char.id)
                      }}
                      title={colorMode ? `点按切换强调色（${accentColor}）` : undefined}
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
      <p className="title-preview__tip">
        {colorMode
          ? '颜色模式：点单个字切换强调色；点色板可改整行底色'
          : '点某一行选中，再用底部工具调节'}
      </p>
    </div>
  )
}
