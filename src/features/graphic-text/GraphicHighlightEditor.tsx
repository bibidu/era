import { ArrowLeft, Check } from 'lucide-react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  buildHighlightDisplayLines,
  type HighlightCharToken,
  type HighlightDisplayLine,
} from './highlightTokens'

interface GraphicHighlightEditorProps {
  markdown: string
  highlightedCharKeys: string[]
  onChange: (keys: string[]) => void
  onConfirm: () => void
  onBack: () => void
}

function isRowFullySelected(tokens: HighlightCharToken[], highlightedSet: Set<string>) {
  return tokens.length > 0 && tokens.every((token) => highlightedSet.has(token.key))
}

function HighlightTokenButton({
  token,
  selected,
  onToggle,
}: {
  token: HighlightCharToken
  selected: boolean
  onToggle: (key: string) => void
}) {
  const isWhitespace = token.char.trim() === ''
  return (
    <button
      type="button"
      data-highlight-token={token.key}
      aria-label={isWhitespace ? '空格' : `高亮 ${token.char}`}
      aria-pressed={selected}
      className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm transition-colors ${
        selected
          ? 'border-2 border-black bg-white font-medium text-neutral-900'
          : 'border border-neutral-300 bg-white text-neutral-700'
      } ${isWhitespace ? 'text-neutral-300' : ''}`}
      onClick={() => onToggle(token.key)}
    >
      {isWhitespace ? '␣' : token.char}
    </button>
  )
}

function HighlightParagraphRows({
  tokens,
  highlightedSet,
  onToggleToken,
  onToggleRow,
}: {
  tokens: HighlightCharToken[]
  highlightedSet: Set<string>
  onToggleToken: (key: string) => void
  onToggleRow: (rowTokens: HighlightCharToken[]) => void
}) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [visualRows, setVisualRows] = useState<HighlightCharToken[][] | null>(null)

  const computeRows = useCallback(() => {
    const el = measureRef.current
    if (!el) return

    const nodes = Array.from(el.querySelectorAll<HTMLElement>('[data-highlight-token]'))
    if (!nodes.length) {
      setVisualRows([])
      return
    }

    const grouped = new Map<number, HighlightCharToken[]>()
    for (const node of nodes) {
      const key = node.dataset.highlightToken
      if (!key) continue
      const token = tokens.find((item) => item.key === key)
      if (!token) continue
      const top = node.offsetTop
      const bucket = grouped.get(top) ?? []
      bucket.push(token)
      grouped.set(top, bucket)
    }

    setVisualRows(
      [...grouped.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, row]) => row),
    )
  }, [tokens])

  useLayoutEffect(() => {
    computeRows()
    const el = measureRef.current
    if (!el) return

    const observer = new ResizeObserver(() => computeRows())
    observer.observe(el)
    return () => observer.disconnect()
  }, [computeRows])

  const measureTokenClassName =
    'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-transparent px-2 text-sm'

  return (
    <div className="relative">
      <div
        ref={measureRef}
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex flex-wrap gap-1.5 pl-7 opacity-0"
        aria-hidden
      >
        {tokens.map((token) => (
          <span key={token.key} data-highlight-token={token.key} className={measureTokenClassName}>
            {token.char.trim() === '' ? '␣' : token.char}
          </span>
        ))}
      </div>

      {visualRows?.map((rowTokens, rowIndex) => {
        const allSelected = isRowFullySelected(rowTokens, highlightedSet)
        return (
          <div key={`row-${rowIndex}`} className="mb-1.5 flex items-start gap-2 last:mb-0">
            <button
              type="button"
              aria-label={allSelected ? '取消全选本行' : '全选本行'}
              aria-checked={allSelected}
              role="radio"
              className="graphic-highlight-row-radio mt-1 shrink-0"
              onClick={() => onToggleRow(rowTokens)}
            >
              <span className="graphic-highlight-row-radio-dot" />
            </button>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {rowTokens.map((token) => (
                <HighlightTokenButton
                  key={token.key}
                  token={token}
                  selected={highlightedSet.has(token.key)}
                  onToggle={onToggleToken}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
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

  const toggleRow = (rowTokens: HighlightCharToken[]) => {
    if (!rowTokens.length) return

    const allSelected = isRowFullySelected(rowTokens, highlightedSet)
    const next = new Set(highlightedCharKeys)

    if (allSelected) {
      rowTokens.forEach((token) => next.delete(token.key))
    } else {
      rowTokens.forEach((token) => next.add(token.key))
    }

    onChange([...next])
  }

  const hasContent = displayLines.some((line) => line.tokens.length > 0)

  const renderLine = (line: HighlightDisplayLine, lineIndex: number) => {
    if (line.isParagraphBreak) {
      return <div key={`break-${lineIndex}`} className="h-3" aria-hidden />
    }
    if (!line.tokens.length) return null

    return (
      <HighlightParagraphRows
        key={`paragraph-${lineIndex}`}
        tokens={line.tokens}
        highlightedSet={highlightedSet}
        onToggleToken={toggleToken}
        onToggleRow={toggleRow}
      />
    )
  }

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
          <div className="flex flex-col gap-3">{displayLines.map(renderLine)}</div>
        )}
      </div>
    </div>
  )
}
