import { ArrowLeft, Check } from 'lucide-react'
import { useMemo } from 'react'
import { buildHighlightDisplayLines } from './highlightTokens'

interface GraphicHighlightEditorProps {
  markdown: string
  highlightedCharKeys: string[]
  onChange: (keys: string[]) => void
  onConfirm: () => void
  onBack: () => void
}

export function GraphicHighlightEditor({
  markdown,
  highlightedCharKeys,
  onChange,
  onConfirm,
  onBack,
}: GraphicHighlightEditorProps) {
  const displayLines = useMemo(() => buildHighlightDisplayLines(markdown), [markdown])
  const highlightedSet = useMemo(() => new Set(highlightedCharKeys), [highlightedCharKeys])

  const toggleToken = (key: string) => {
    const next = new Set(highlightedCharKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange([...next])
  }

  const hasContent = displayLines.some((line) => line.tokens.length > 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2">
        <button
          type="button"
          aria-label="返回"
          className="flex size-9 items-center justify-center rounded-full active:bg-neutral-100"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-sm font-semibold">高亮设置</p>
        <button
          type="button"
          aria-label="确认"
          className="component-done-btn"
          onClick={onConfirm}
        >
          <Check size={15} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 text-xs text-neutral-500">
          点击文字或标点即可高亮，已选 {highlightedCharKeys.length} 个字符
        </p>
        {!hasContent ? (
          <p className="py-8 text-center text-sm text-neutral-400">暂无文字内容</p>
        ) : (
          <div className="flex flex-col gap-3">
            {displayLines.map((line, lineIndex) => {
              if (line.isParagraphBreak) {
                return <div key={`break-${lineIndex}`} className="h-3" aria-hidden />
              }
              if (!line.tokens.length) return null

              return (
                <div key={`line-${lineIndex}`} className="flex flex-wrap gap-1.5">
                  {line.tokens.map((token) => {
                    const selected = highlightedSet.has(token.key)
                    const isWhitespace = token.char.trim() === ''
                    return (
                      <button
                        key={token.key}
                        type="button"
                        aria-label={isWhitespace ? '空格' : `高亮 ${token.char}`}
                        aria-pressed={selected}
                        className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm transition-colors ${
                          selected
                            ? 'border-2 border-black bg-white font-medium text-neutral-900'
                            : 'border border-neutral-300 bg-white text-neutral-700'
                        } ${isWhitespace ? 'text-neutral-300' : ''}`}
                        onClick={() => toggleToken(token.key)}
                      >
                        {isWhitespace ? '␣' : token.char}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
