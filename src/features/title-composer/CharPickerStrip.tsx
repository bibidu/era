import type { TitleLine } from './types'

interface CharPickerStripProps {
  line: TitleLine
  selectedCharId: string | null
  onSelectChar: (charId: string | null) => void
}

/** 大触控字条：点选单个字，再去调颜色（比直接点预览里的小字准） */
export function CharPickerStrip({ line, selectedCharId, onSelectChar }: CharPickerStripProps) {
  return (
    <div className="title-char-picker">
      <div className="title-char-picker__head">
        <span>选字</span>
        <button
          type="button"
          className={`title-char-picker__all ${selectedCharId === null ? 'is-active' : ''}`}
          onClick={() => onSelectChar(null)}
        >
          整行
        </button>
        {selectedCharId ? (
          <span className="title-char-picker__current">
            已选「{line.chars.find((c) => c.id === selectedCharId)?.ch ?? ''}」
          </span>
        ) : (
          <span className="title-char-picker__current">未选字 · 颜色作用于整行</span>
        )}
      </div>
      <div className="title-char-picker__scroll component-scroll-row">
        {line.chars.map((char, index) => {
          const active = char.id === selectedCharId
          const accent = Boolean(char.color)
          return (
            <button
              key={char.id}
              type="button"
              className={`title-char-picker__btn ${active ? 'is-active' : ''} ${
                accent ? 'has-accent' : ''
              }`}
              style={{ color: char.color ?? line.color }}
              aria-pressed={active}
              onClick={() => onSelectChar(active ? null : char.id)}
            >
              <span className="title-char-picker__index">{index + 1}</span>
              <span className="title-char-picker__glyph">{char.ch}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
