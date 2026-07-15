import { ArrowLeft, Check } from 'lucide-react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { HAND_DRAWN_CIRCLE_PATH, HAND_DRAWN_CIRCLE_VIEWBOX } from './circleHighlight'
import {
  buildHighlightCharPageMap,
  buildHighlightDisplayLines,
  type HighlightCharToken,
  type HighlightDisplayLine,
} from './highlightTokens'
import type { GraphicTextConfig } from './types'

export type HighlightStyleTab = 'underline' | 'quote' | 'circle'

const HIGHLIGHT_STYLE_TABS: { id: HighlightStyleTab; label: string }[] = [
  { id: 'underline', label: '下划线' },
  { id: 'quote', label: '引用' },
  { id: 'circle', label: '线圈' },
]

function HighlightStyleTabLabel({
  tab,
  themeColor,
  selected,
}: {
  tab: HighlightStyleTab
  themeColor: string
  selected: boolean
}) {
  const textClass = selected ? 'text-neutral-900' : 'text-neutral-500'

  if (tab === 'underline') {
    return (
      <span className={`relative text-xs font-medium ${textClass}`}>
        <span>下划线</span>
        <span
          className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full"
          style={{ backgroundColor: themeColor }}
          aria-hidden
        />
      </span>
    )
  }

  if (tab === 'quote') {
    return (
      <span className={`flex items-center gap-1.5 text-xs font-medium ${textClass}`}>
        <span
          className="h-3.5 w-0.5 shrink-0 rounded-full"
          style={{ backgroundColor: themeColor }}
          aria-hidden
        />
        引用
      </span>
    )
  }

  return (
    <span className={`relative inline-flex items-center px-1.5 py-0.5 text-xs font-medium ${textClass}`}>
      <span className="relative z-[1]">线圈</span>
      <svg
        className="pointer-events-none absolute -inset-x-1 -inset-y-1 h-[calc(100%+8px)] w-[calc(100%+8px)]"
        viewBox={HAND_DRAWN_CIRCLE_VIEWBOX}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={HAND_DRAWN_CIRCLE_PATH}
          fill="none"
          stroke={themeColor}
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

interface GraphicHighlightEditorProps {
  markdown: string
  config: GraphicTextConfig
  themeColor: string
  underlineHighlightedCharKeys: string[]
  quoteHighlightedCharKeys: string[]
  circleHighlightedCharKeys: string[]
  onUnderlineChange: (keys: string[]) => void
  onQuoteChange: (keys: string[]) => void
  onCircleChange: (keys: string[]) => void
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

function HighlightPageRail({ segments }: { segments: Array<{ page: number; top: number; height: number }> }) {
  if (!segments.length) return null

  return (
    <div className="graphic-highlight-page-rail" aria-hidden>
      {segments.map((segment, index) => (
        <span
          key={`${segment.page}-${segment.top}-${index}`}
          className={`graphic-highlight-page-rail-segment ${
            segment.page % 2 === 1
              ? 'graphic-highlight-page-rail-segment--odd'
              : 'graphic-highlight-page-rail-segment--even'
          }`}
          style={{ top: segment.top, height: segment.height }}
          title={`第 ${segment.page} 页`}
        />
      ))}
    </div>
  )
}

function buildPageBarSegments(
  rowElements: Array<HTMLElement | null>,
  visualRows: HighlightCharToken[][],
  charPageMap: Map<string, number>,
) {
  const segments: Array<{ page: number; top: number; height: number }> = []

  visualRows.forEach((rowTokens, index) => {
    const element = rowElements[index]
    if (!element) return

    const page = charPageMap.get(rowTokens[0]?.key ?? '') ?? 1
    const top = element.offsetTop
    const height = element.offsetHeight
    const previous = segments[segments.length - 1]

    if (previous && previous.page === page) {
      const bottom = Math.max(previous.top + previous.height, top + height)
      previous.height = bottom - previous.top
      return
    }

    segments.push({ page, top, height })
  })

  return segments
}

function HighlightParagraphRows({
  tokens,
  highlightedSet,
  charPageMap,
  onToggleToken,
  onToggleRow,
}: {
  tokens: HighlightCharToken[]
  highlightedSet: Set<string>
  charPageMap: Map<string, number>
  onToggleToken: (key: string) => void
  onToggleRow: (rowTokens: HighlightCharToken[]) => void
}) {
  const paragraphRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Array<HTMLDivElement | null>>([])
  const [visualRows, setVisualRows] = useState<HighlightCharToken[][] | null>(null)
  const [pageBarSegments, setPageBarSegments] = useState<
    Array<{ page: number; top: number; height: number }>
  >([])

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

  const updatePageBarSegments = useCallback(() => {
    if (!visualRows?.length) {
      setPageBarSegments([])
      return
    }
    setPageBarSegments(buildPageBarSegments(rowRefs.current, visualRows, charPageMap))
  }, [charPageMap, visualRows])

  useLayoutEffect(() => {
    computeRows()
    const el = measureRef.current
    if (!el) return

    const observer = new ResizeObserver(() => computeRows())
    observer.observe(el)
    return () => observer.disconnect()
  }, [computeRows])

  useLayoutEffect(() => {
    rowRefs.current = rowRefs.current.slice(0, visualRows?.length ?? 0)
  }, [visualRows])

  useLayoutEffect(() => {
    updatePageBarSegments()
    const paragraph = paragraphRef.current
    if (!paragraph) return

    const observer = new ResizeObserver(() => updatePageBarSegments())
    observer.observe(paragraph)
    return () => observer.disconnect()
  }, [updatePageBarSegments])

  const measureTokenClassName =
    'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-transparent px-2 text-sm'

  return (
    <div ref={paragraphRef} className="graphic-highlight-paragraph">
      <div ref={measureRef} className="graphic-highlight-row-measure" aria-hidden>
        {tokens.map((token) => (
          <span key={token.key} data-highlight-token={token.key} className={measureTokenClassName}>
            {token.char.trim() === '' ? '␣' : token.char}
          </span>
        ))}
      </div>

      {visualRows?.map((rowTokens, rowIndex) => {
        const allSelected = isRowFullySelected(rowTokens, highlightedSet)
        const isParagraphEnd = rowIndex === visualRows.length - 1
        return (
          <div
            key={`row-${rowIndex}`}
            ref={(element) => {
              rowRefs.current[rowIndex] = element
            }}
            className="graphic-highlight-row"
          >
            <div
              className={`graphic-highlight-row-body${
                isParagraphEnd ? ' graphic-highlight-row-body--paragraph-end' : ''
              }`}
            >
              <button
                type="button"
                aria-label={allSelected ? '取消全选本行' : '全选本行'}
                aria-checked={allSelected}
                role="radio"
                className="graphic-highlight-row-radio shrink-0"
                onClick={() => onToggleRow(rowTokens)}
              >
                <span className="graphic-highlight-row-radio-dot" />
              </button>
              <div className="graphic-highlight-row-tokens">
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
          </div>
        )
      })}

      <HighlightPageRail segments={pageBarSegments} />
    </div>
  )
}

export function GraphicHighlightEditor({
  markdown,
  config,
  themeColor,
  underlineHighlightedCharKeys,
  quoteHighlightedCharKeys,
  circleHighlightedCharKeys,
  onUnderlineChange,
  onQuoteChange,
  onCircleChange,
  onConfirm,
  onBack,
}: GraphicHighlightEditorProps) {
  const [activeStyleTab, setActiveStyleTab] = useState<HighlightStyleTab>('underline')
  const displayLines = useMemo(() => buildHighlightDisplayLines(markdown), [markdown])
  const charPageMap = useMemo(() => buildHighlightCharPageMap(markdown, config), [markdown, config])

  const activeKeys =
    activeStyleTab === 'underline'
      ? underlineHighlightedCharKeys
      : activeStyleTab === 'quote'
        ? quoteHighlightedCharKeys
        : circleHighlightedCharKeys
  const onActiveChange =
    activeStyleTab === 'underline'
      ? onUnderlineChange
      : activeStyleTab === 'quote'
        ? onQuoteChange
        : onCircleChange

  const highlightedSet = useMemo(() => new Set(activeKeys), [activeKeys])

  const toggleToken = (key: string) => {
    const next = new Set(activeKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onActiveChange([...next])
  }

  const toggleRow = (rowTokens: HighlightCharToken[]) => {
    if (!rowTokens.length) return

    const allSelected = isRowFullySelected(rowTokens, highlightedSet)
    const next = new Set(activeKeys)

    if (allSelected) {
      rowTokens.forEach((token) => next.delete(token.key))
    } else {
      rowTokens.forEach((token) => next.add(token.key))
    }

    onActiveChange([...next])
  }

  const hasContent = displayLines.some((line) => line.tokens.length > 0)

  const hintText =
    activeStyleTab === 'underline'
      ? '点击文字设置下划线高亮，已选'
      : activeStyleTab === 'quote'
        ? '点击文字设置引用高亮（所在行左侧显示竖杠），已选'
        : '点击文字设置线圈高亮（同行连续文字共用一个线圈），已选'

  const renderLine = (line: HighlightDisplayLine, lineIndex: number) => {
    if (line.isParagraphBreak) return null
    if (!line.tokens.length) return null

    return (
      <HighlightParagraphRows
        key={`paragraph-${lineIndex}`}
        tokens={line.tokens}
        highlightedSet={highlightedSet}
        charPageMap={charPageMap}
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

      <div className="shrink-0 px-4 py-2.5">
        <div className="graphic-highlight-tab-group" role="tablist" aria-label="高亮样式">
          {HIGHLIGHT_STYLE_TABS.map((tab) => {
            const selected = activeStyleTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`graphic-highlight-tab ${selected ? 'graphic-highlight-tab--active' : ''}`}
                onClick={() => setActiveStyleTab(tab.id)}
              >
                <HighlightStyleTabLabel tab={tab.id} themeColor={themeColor} selected={selected} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 text-xs text-neutral-500">
          {hintText} {activeKeys.length} 个字符
        </p>
        {!hasContent ? (
          <p className="py-8 text-center text-sm text-neutral-400">暂无文字内容</p>
        ) : (
          <div className="flex flex-col">{displayLines.map(renderLine)}</div>
        )}
      </div>
    </div>
  )
}
