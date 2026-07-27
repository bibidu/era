import { ArrowLeft, Check } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HAND_DRAWN_CIRCLE_PATH, HAND_DRAWN_CIRCLE_VIEWBOX } from './circleHighlight'
import {
  HAND_DRAWN_UNDERLINE_PATH,
  HAND_DRAWN_UNDERLINE_STROKE_WIDTH,
  HAND_DRAWN_UNDERLINE_VIEWBOX,
} from './handDrawnUnderlinePath'
import {
  buildHighlightCharPageMapFromDocument,
  buildHighlightDisplayLinesFromDocument,
  type HighlightCharToken,
  type HighlightDisplayLine,
} from './highlightTokens'
import type { GraphicDocument } from './document'
import { GraphicPageRail } from './GraphicPageRail'
import type { GraphicTextConfig } from './types'
import {
  THEME_COLORS,
  type HighlightColorMap,
} from './highlightColors'
import { themeAlpha } from './inlineHighlight'

const TAB_PREVIEW_COLOR = '#171717'
const BRUSH_TAB_PREVIEW_BG = '#F0F0F0'
const COLOR_POPOVER_EDGE_MARGIN = 12
const COLOR_POPOVER_TRIGGER_GAP = 8

export type HighlightStyleTab = 'underline' | 'handUnderline' | 'brush' | 'quote' | 'circle'

const HIGHLIGHT_STYLE_TABS: {
  id: HighlightStyleTab
  label: string
  disabled?: boolean
}[] = [
  { id: 'underline', label: '下划线' },
  { id: 'handUnderline', label: '手绘线', disabled: true },
  { id: 'brush', label: '刷子' },
  { id: 'quote', label: '引用' },
  { id: 'circle', label: '线圈' },
]

function HighlightStyleTabLabel({
  tab,
  selected,
  disabled = false,
}: {
  tab: HighlightStyleTab
  selected: boolean
  disabled?: boolean
}) {
  const textClass = disabled
    ? 'text-neutral-300'
    : selected
      ? 'text-neutral-900'
      : 'text-neutral-500'
  const previewColor = disabled ? '#D4D4D4' : TAB_PREVIEW_COLOR
  const brushPreviewBg = disabled ? '#F5F5F5' : BRUSH_TAB_PREVIEW_BG

  if (tab === 'underline') {
    return (
      <span className={`relative inline-flex items-center text-xs font-medium ${textClass}`}>
        <span>下划线</span>
        <span
          className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full"
          style={{ backgroundColor: previewColor }}
          aria-hidden
        />
      </span>
    )
  }

  if (tab === 'handUnderline') {
    return (
      <span className={`relative inline-flex items-center text-xs font-medium ${textClass}`}>
        <span className="relative z-[1]">手绘线</span>
        <svg
          className="pointer-events-none absolute -inset-x-0.5 -bottom-1 h-3 w-[calc(100%+4px)]"
          viewBox={HAND_DRAWN_UNDERLINE_VIEWBOX}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={HAND_DRAWN_UNDERLINE_PATH}
            fill="none"
            stroke={previewColor}
            strokeWidth={HAND_DRAWN_UNDERLINE_STROKE_WIDTH}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }

  if (tab === 'brush') {
    return (
      <span
        className={`rounded px-1.5 py-0.5 text-xs font-medium ${textClass}`}
        style={{ backgroundColor: brushPreviewBg }}
      >
        刷子
      </span>
    )
  }

  if (tab === 'quote') {
    return (
      <span className={`flex items-center gap-1.5 text-xs font-medium ${textClass}`}>
        <span
          className="h-3.5 w-0.5 shrink-0 rounded-full"
          style={{ backgroundColor: previewColor }}
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
          stroke={previewColor}
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function HighlightColorPopover({
  color,
  onChange,
}: {
  color: string
  onChange: (color: string) => void
}) {
  const isCustomColor = !THEME_COLORS.includes(color)
  const [open, setOpen] = useState(false)
  const [colorLocked, setColorLocked] = useState(
    () => isCustomColor || color !== '#FACC15',
  )
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})
  const anchorRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const left = rect.right + COLOR_POPOVER_TRIGGER_GAP
    const maxWidth = Math.max(
      120,
      window.innerWidth - left - COLOR_POPOVER_EDGE_MARGIN,
    )

    setPopoverStyle({
      top: rect.top + rect.height / 2,
      left,
      maxWidth,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePopoverPosition()

    window.addEventListener('resize', updatePopoverPosition)
    window.visualViewport?.addEventListener('resize', updatePopoverPosition)
    window.visualViewport?.addEventListener('scroll', updatePopoverPosition)

    return () => {
      window.removeEventListener('resize', updatePopoverPosition)
      window.visualViewport?.removeEventListener('resize', updatePopoverPosition)
      window.visualViewport?.removeEventListener('scroll', updatePopoverPosition)
    }
  }, [open, updatePopoverPosition])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (anchorRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const handleSelect = (nextColor: string) => {
    onChange(nextColor)
    setColorLocked(true)
    setOpen(false)
  }

  const popover =
    open &&
    createPortal(
      <div
        ref={popoverRef}
        className="graphic-highlight-color-popover graphic-highlight-color-popover--fixed"
        style={popoverStyle}
        role="dialog"
        aria-label="高亮颜色"
      >
        <div className="graphic-highlight-color-popover-row component-scroll-row">
          {THEME_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`主题色 ${swatch}`}
              className={`graphic-highlight-color-swatch ${
                color === swatch ? 'graphic-highlight-color-swatch--selected' : ''
              }`}
              style={{ backgroundColor: swatch }}
              onClick={() => handleSelect(swatch)}
            />
          ))}
          <label
            className={`theme-color-palette-btn graphic-highlight-color-swatch graphic-highlight-color-swatch--picker ${
              isCustomColor ? 'graphic-highlight-color-swatch--selected' : ''
            }`}
          >
            <input
              type="color"
              value={color}
              onChange={(event) => handleSelect(event.target.value)}
              className="absolute inset-[-8px] size-12 cursor-pointer opacity-0"
              aria-label="自定义主题色"
            />
          </label>
        </div>
      </div>,
      document.body,
    )

  return (
    <div ref={anchorRef} className="graphic-highlight-color-anchor">
      <button
        ref={triggerRef}
        type="button"
        aria-label="选择高亮颜色"
        aria-expanded={open}
        className={
          colorLocked
            ? 'graphic-highlight-color-swatch graphic-highlight-color-swatch--selected graphic-highlight-color-trigger'
            : 'theme-color-palette-btn graphic-highlight-color-swatch graphic-highlight-color-swatch--picker graphic-highlight-color-trigger'
        }
        style={colorLocked ? { backgroundColor: color } : undefined}
        onClick={() => setOpen((current) => !current)}
      />
      {popover}
    </div>
  )
}

interface GraphicHighlightEditorProps {
  markdown: string
  document?: GraphicDocument
  config: GraphicTextConfig
  underlineHighlightColors: HighlightColorMap
  handUnderlineHighlightColors: HighlightColorMap
  brushHighlightColors: HighlightColorMap
  quoteHighlightColors: HighlightColorMap
  circleHighlightColors: HighlightColorMap
  highlightPickerColor: string
  onUnderlineChange: (colors: HighlightColorMap) => void
  onHandUnderlineChange: (colors: HighlightColorMap) => void
  onBrushChange: (colors: HighlightColorMap) => void
  onQuoteChange: (colors: HighlightColorMap) => void
  onCircleChange: (colors: HighlightColorMap) => void
  onPickerColorChange: (color: string) => void
  onConfirm: () => void
  onBack: () => void
  hideHeader?: boolean
  /** 仅显示指定页（1-based）；不传则展示全文并显示页码轨 */
  visiblePage?: number | null
  onPageCountChange?: (pageCount: number) => void
}

function isRowFullySelected(tokens: HighlightCharToken[], highlightedSet: Set<string>) {
  return tokens.length > 0 && tokens.every((token) => highlightedSet.has(token.key))
}

function HighlightTokenButton({
  token,
  selected,
  styleTab,
  highlightColor,
  onPointerDownToken,
}: {
  token: HighlightCharToken
  selected: boolean
  styleTab: HighlightStyleTab
  highlightColor?: string
  onPointerDownToken: (key: string, selected: boolean, event: React.PointerEvent) => void
}) {
  const isWhitespace = token.char.trim() === ''
  const previewColor = highlightColor ?? TAB_PREVIEW_COLOR

  return (
    <button
      type="button"
      data-highlight-token={token.key}
      aria-label={isWhitespace ? '空格' : `高亮 ${token.char}`}
      aria-pressed={selected}
      className={`relative inline-flex min-h-9 min-w-9 touch-none items-center justify-center rounded-lg border border-neutral-300 bg-white px-2 text-sm transition-colors select-none ${
        selected ? 'font-medium text-neutral-900' : 'text-neutral-700'
      } ${isWhitespace ? 'text-neutral-300' : ''}`}
      onPointerDown={(event) => {
        event.preventDefault()
        onPointerDownToken(token.key, selected, event)
      }}
    >
      {selected && styleTab === 'quote' && (
        <span
          className="absolute bottom-1.5 left-1.5 top-1.5 w-0.5 rounded-full"
          style={{ backgroundColor: previewColor }}
          aria-hidden
        />
      )}
      {selected && styleTab === 'brush' && (
        <span
          className="absolute inset-1 rounded-md"
          style={{ backgroundColor: themeAlpha(previewColor, 0.28) }}
          aria-hidden
        />
      )}
      <span className={`relative z-[1] ${selected && styleTab === 'quote' ? 'pl-1' : ''}`}>
        {isWhitespace ? '␣' : token.char}
      </span>
      {selected && styleTab === 'underline' && (
        <span
          className="absolute bottom-1 left-1.5 right-1.5 h-0.5 rounded-full"
          style={{ backgroundColor: previewColor }}
          aria-hidden
        />
      )}
      {selected && styleTab === 'handUnderline' && (
        <svg
          className="pointer-events-none absolute -inset-x-0.5 bottom-0.5 h-3 w-[calc(100%+4px)]"
          viewBox={HAND_DRAWN_UNDERLINE_VIEWBOX}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={HAND_DRAWN_UNDERLINE_PATH}
            fill="none"
            stroke={previewColor}
            strokeWidth={HAND_DRAWN_UNDERLINE_STROKE_WIDTH}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {selected && styleTab === 'circle' && (
        <svg
          className="pointer-events-none absolute -inset-0.5 h-[calc(100%+4px)] w-[calc(100%+4px)]"
          viewBox={HAND_DRAWN_CIRCLE_VIEWBOX}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={HAND_DRAWN_CIRCLE_PATH}
            fill="none"
            stroke={previewColor}
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}

function HighlightPageRail({ segments }: { segments: Array<{ page: number; top: number; height: number }> }) {
  return <GraphicPageRail segments={segments} />
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
  activeColorMap,
  activeStyleTab,
  charPageMap,
  hidePageRail,
  onPointerDownToken,
  onToggleRow,
}: {
  tokens: HighlightCharToken[]
  highlightedSet: Set<string>
  activeColorMap: HighlightColorMap
  activeStyleTab: HighlightStyleTab
  charPageMap: Map<string, number>
  hidePageRail?: boolean
  onPointerDownToken: (key: string, selected: boolean, event: React.PointerEvent) => void
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
                    styleTab={activeStyleTab}
                    highlightColor={activeColorMap[token.key]}
                    onPointerDownToken={onPointerDownToken}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {!hidePageRail && <HighlightPageRail segments={pageBarSegments} />}
    </div>
  )
}

export function GraphicHighlightEditor({
  markdown,
  document,
  config,
  underlineHighlightColors,
  handUnderlineHighlightColors,
  brushHighlightColors,
  quoteHighlightColors,
  circleHighlightColors,
  highlightPickerColor,
  onUnderlineChange,
  onHandUnderlineChange,
  onBrushChange,
  onQuoteChange,
  onCircleChange,
  onPickerColorChange,
  onConfirm,
  onBack,
  hideHeader = false,
  visiblePage = null,
  onPageCountChange,
}: GraphicHighlightEditorProps) {
  const [activeStyleTab, setActiveStyleTab] = useState<HighlightStyleTab>('underline')
  const activeTabIndex = HIGHLIGHT_STYLE_TABS.findIndex((tab) => tab.id === activeStyleTab)
  const tabGroupRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 })
  const paintRef = useRef<{ mode: 'add' | 'remove' } | null>(null)
  const paintKeysRef = useRef<Set<string>>(new Set())
  const activeColorMapRef = useRef<HighlightColorMap>({})
  const onActiveChangeRef = useRef<(colors: HighlightColorMap) => void>(() => {})
  const pickerColorRef = useRef(highlightPickerColor)

  const updateTabIndicator = useCallback(() => {
    const tab = tabRefs.current[activeTabIndex]
    if (!tab) return
    setTabIndicator({ left: tab.offsetLeft, width: tab.offsetWidth })
  }, [activeTabIndex])

  useLayoutEffect(() => {
    updateTabIndicator()
  }, [updateTabIndicator])

  useEffect(() => {
    const group = tabGroupRef.current
    if (!group) return

    const observer = new ResizeObserver(() => updateTabIndicator())
    observer.observe(group)
    return () => observer.disconnect()
  }, [updateTabIndicator])

  const displayLines = useMemo(
    () =>
      document
        ? buildHighlightDisplayLinesFromDocument(document)
        : buildHighlightDisplayLinesFromDocument({
            blocks: [{ id: 'legacy', kind: 'markdown', text: markdown }],
            assets: {},
          }),
    [document, markdown],
  )
  const charPageMap = useMemo(
    () =>
      document
        ? buildHighlightCharPageMapFromDocument(document, config)
        : buildHighlightCharPageMapFromDocument(
            { blocks: [{ id: 'legacy', kind: 'markdown', text: markdown }], assets: {} },
            config,
          ),
    [document, markdown, config],
  )

  const pageCount = useMemo(() => {
    let max = 1
    for (const page of charPageMap.values()) {
      if (page > max) max = page
    }
    return max
  }, [charPageMap])

  useEffect(() => {
    onPageCountChange?.(pageCount)
  }, [onPageCountChange, pageCount])

  const visibleLines = useMemo(() => {
    if (visiblePage == null) return displayLines
    const filtered: HighlightDisplayLine[] = []
    for (const line of displayLines) {
      if (line.isParagraphBreak) {
        if (filtered.length && !filtered[filtered.length - 1]?.isParagraphBreak) {
          filtered.push(line)
        }
        continue
      }
      const tokens = line.tokens.filter((token) => charPageMap.get(token.key) === visiblePage)
      if (!tokens.length) continue
      filtered.push({ ...line, tokens })
    }
    while (filtered.length && filtered[0]?.isParagraphBreak) filtered.shift()
    while (filtered.length && filtered[filtered.length - 1]?.isParagraphBreak) filtered.pop()
    return filtered
  }, [charPageMap, displayLines, visiblePage])

  const activeColorMap =
    activeStyleTab === 'underline'
      ? underlineHighlightColors
      : activeStyleTab === 'handUnderline'
        ? handUnderlineHighlightColors
        : activeStyleTab === 'brush'
          ? brushHighlightColors
          : activeStyleTab === 'quote'
            ? quoteHighlightColors
            : circleHighlightColors
  const onActiveChange =
    activeStyleTab === 'underline'
      ? onUnderlineChange
      : activeStyleTab === 'handUnderline'
        ? onHandUnderlineChange
        : activeStyleTab === 'brush'
          ? onBrushChange
          : activeStyleTab === 'quote'
            ? onQuoteChange
            : onCircleChange

  activeColorMapRef.current = activeColorMap
  onActiveChangeRef.current = onActiveChange
  pickerColorRef.current = highlightPickerColor

  const highlightedSet = useMemo(() => new Set(Object.keys(activeColorMap)), [activeColorMap])

  const applyPaintKey = useCallback((key: string, mode: 'add' | 'remove') => {
    if (paintKeysRef.current.has(`${mode}:${key}`)) return
    paintKeysRef.current.add(`${mode}:${key}`)
    const next = { ...activeColorMapRef.current }
    if (mode === 'remove') {
      if (!next[key]) return
      delete next[key]
    } else {
      next[key] = pickerColorRef.current
    }
    activeColorMapRef.current = next
    onActiveChangeRef.current(next)
  }, [])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!paintRef.current) return
      const el = globalThis.document.elementFromPoint(event.clientX, event.clientY)
      const tokenEl = el?.closest?.('[data-highlight-token]') as HTMLElement | null
      const key = tokenEl?.dataset.highlightToken
      if (!key) return
      applyPaintKey(key, paintRef.current.mode)
    }
    const endPaint = () => {
      paintRef.current = null
      paintKeysRef.current.clear()
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endPaint)
    window.addEventListener('pointercancel', endPaint)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endPaint)
      window.removeEventListener('pointercancel', endPaint)
    }
  }, [applyPaintKey])

  const handleTokenPointerDown = (
    key: string,
    selected: boolean,
    _event: React.PointerEvent,
  ) => {
    const mode: 'add' | 'remove' = selected ? 'remove' : 'add'
    paintRef.current = { mode }
    paintKeysRef.current.clear()
    applyPaintKey(key, mode)
  }

  const toggleRow = (rowTokens: HighlightCharToken[]) => {
    if (!rowTokens.length) return

    const allSelected = isRowFullySelected(rowTokens, highlightedSet)
    const next = { ...activeColorMap }

    if (allSelected) {
      rowTokens.forEach((token) => {
        delete next[token.key]
      })
    } else {
      rowTokens.forEach((token) => {
        next[token.key] = highlightPickerColor
      })
    }

    onActiveChange(next)
  }

  const hasContent = visibleLines.some((line) => line.tokens.length > 0)

  const renderLine = (line: HighlightDisplayLine, lineIndex: number) => {
    if (line.isParagraphBreak) return null
    if (!line.tokens.length) return null

    return (
      <HighlightParagraphRows
        key={`paragraph-${lineIndex}`}
        tokens={line.tokens}
        highlightedSet={highlightedSet}
        activeColorMap={activeColorMap}
        activeStyleTab={activeStyleTab}
        charPageMap={charPageMap}
        hidePageRail={visiblePage != null}
        onPointerDownToken={handleTokenPointerDown}
        onToggleRow={toggleRow}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!hideHeader && (
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
      )}

      <div className="shrink-0 px-4 py-2.5">
        <div className="graphic-highlight-toolbar-row">
          <HighlightColorPopover color={highlightPickerColor} onChange={onPickerColorChange} />

          <div className="graphic-highlight-tab-scroll min-w-0 flex-1">
            <div
              ref={tabGroupRef}
              className="graphic-highlight-tab-group"
              role="tablist"
              aria-label="高亮样式"
            >
              <div
                className="graphic-highlight-tab-indicator"
                style={{ left: tabIndicator.left, width: tabIndicator.width }}
                aria-hidden
              />
              {HIGHLIGHT_STYLE_TABS.map((tab, index) => {
                const selected = activeStyleTab === tab.id
                const disabled = Boolean(tab.disabled)
                return (
                  <button
                    key={tab.id}
                    ref={(node) => {
                      tabRefs.current[index] = node
                    }}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-disabled={disabled}
                    disabled={disabled}
                    title={disabled ? '暂不可用' : undefined}
                    className={`graphic-highlight-tab ${selected ? 'graphic-highlight-tab--active' : ''} ${
                      disabled ? 'graphic-highlight-tab--disabled' : ''
                    }`}
                    onClick={() => {
                      if (disabled) return
                      setActiveStyleTab(tab.id)
                      tabRefs.current[index]?.scrollIntoView({
                        behavior: 'smooth',
                        inline: 'nearest',
                        block: 'nearest',
                      })
                    }}
                  >
                    <HighlightStyleTabLabel tab={tab.id} selected={selected} disabled={disabled} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-neutral-400">
          先选样式与颜色，再在文字上点击或滑动选中；同一位置可叠多种样式。
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {!hasContent ? (
          <p className="py-8 text-center text-sm text-neutral-400">暂无文字内容</p>
        ) : (
          <div className="flex flex-col">{visibleLines.map(renderLine)}</div>
        )}
      </div>
    </div>
  )
}
