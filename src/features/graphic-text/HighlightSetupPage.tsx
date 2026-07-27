import {
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  LoaderCircle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { agentHttpBase } from '../../agent/agentHttp'
import {
  buildHighlightSetupPayload,
  serializeHighlightSetup,
  toApplyHighlightRanges,
} from '../../agent/highlightClipboard'
import {
  highlightMapsToRanges,
  type HighlightMaps,
} from '../../agent/highlightRanges'
import {
  fetchHighlightSetupShare,
  saveHighlightSetupResult,
} from '../../agent/supabaseHighlightSetup'
import {
  createDocumentFromMarkdown,
  getDocumentMarkdown,
  normalizeDocument,
  parseScopedMarkdown,
  type GraphicDocument,
} from './document'
import { GraphicPage } from './GraphicPage'
import { computeGraphicPageDisplaySize } from './graphicPreviewLayout'
import { THEME_COLORS } from './highlightColors'
import type { InteractiveHighlightStyle } from './InteractiveHighlightedText'
import { stripHighlightMarkers } from './inlineHighlight'
import { getGraphicLayout, paginateDocument } from './layout'
import {
  createHighlightPreviewDraft,
  type HighlightPreviewDraft,
} from './GraphicTextConfigSheet'
import {
  DEFAULT_GRAPHIC_TEXT_CONFIG,
  type GraphicTextConfig,
} from './types'

const STYLE_TABS: { id: InteractiveHighlightStyle; label: string; disabled?: boolean }[] = [
  { id: 'underline', label: '下划线' },
  { id: 'brush', label: '刷子' },
  { id: 'circle', label: '线圈' },
  { id: 'quote', label: '引用' },
  { id: 'handUnderline', label: '手绘线', disabled: true },
]

const ZOOM_MIN = 1
const ZOOM_MAX = 2.5
const ZOOM_STEP = 0.25

function plainTextByBlockIdFromDocument(document: GraphicDocument): Record<string, string> {
  const result: Record<string, string> = {}
  for (const block of document.blocks) {
    if (block.kind !== 'markdown') continue
    for (const md of parseScopedMarkdown(block.id, block.text)) {
      result[md.id] = stripHighlightMarkers(md.text)
    }
  }
  return result
}

function draftToMaps(draft: HighlightPreviewDraft): HighlightMaps {
  return {
    underlineHighlightColors: draft.underlineHighlightColors,
    handUnderlineHighlightColors: draft.handUnderlineHighlightColors ?? {},
    brushHighlightColors: draft.brushHighlightColors,
    quoteHighlightColors: draft.quoteHighlightColors,
    circleHighlightColors: draft.circleHighlightColors,
  }
}

function mergeConfig(
  raw: Partial<GraphicTextConfig> | Record<string, unknown> | null | undefined,
): GraphicTextConfig {
  return {
    ...DEFAULT_GRAPHIC_TEXT_CONFIG,
    ...(raw as Partial<GraphicTextConfig>),
    underlineHighlightColors: {
      ...DEFAULT_GRAPHIC_TEXT_CONFIG.underlineHighlightColors,
      ...((raw as GraphicTextConfig | undefined)?.underlineHighlightColors ?? {}),
    },
    handUnderlineHighlightColors: {
      ...DEFAULT_GRAPHIC_TEXT_CONFIG.handUnderlineHighlightColors,
      ...((raw as GraphicTextConfig | undefined)?.handUnderlineHighlightColors ?? {}),
    },
    brushHighlightColors: {
      ...DEFAULT_GRAPHIC_TEXT_CONFIG.brushHighlightColors,
      ...((raw as GraphicTextConfig | undefined)?.brushHighlightColors ?? {}),
    },
    quoteHighlightColors: {
      ...DEFAULT_GRAPHIC_TEXT_CONFIG.quoteHighlightColors,
      ...((raw as GraphicTextConfig | undefined)?.quoteHighlightColors ?? {}),
    },
    circleHighlightColors: {
      ...DEFAULT_GRAPHIC_TEXT_CONFIG.circleHighlightColors,
      ...((raw as GraphicTextConfig | undefined)?.circleHighlightColors ?? {}),
    },
  }
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  document.body.removeChild(area)
}

export function HighlightSetupPage({
  projectId,
  shareId,
}: {
  projectId?: string | null
  shareId?: string | null
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doc, setDoc] = useState<GraphicDocument | null>(null)
  const [baseConfig, setBaseConfig] = useState<GraphicTextConfig>(DEFAULT_GRAPHIC_TEXT_CONFIG)
  const [draft, setDraft] = useState<HighlightPreviewDraft>(() =>
    createHighlightPreviewDraft(DEFAULT_GRAPHIC_TEXT_CONFIG),
  )
  const [resolvedProjectId, setResolvedProjectId] = useState(projectId ?? '')
  const [resolvedShareId, setResolvedShareId] = useState(shareId ?? '')
  const [currentPage, setCurrentPage] = useState(0)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [activeStyle, setActiveStyle] = useState<InteractiveHighlightStyle>('brush')
  const [basePreviewWidth, setBasePreviewWidth] = useState<number | undefined>(undefined)
  const [zoom, setZoom] = useState(1)
  const previewHostRef = useRef<HTMLDivElement>(null)
  const paintRef = useRef<{ mode: 'add' | 'remove' } | null>(null)
  const paintKeysRef = useRef<Set<string>>(new Set())
  const draftRef = useRef(draft)
  const activeStyleRef = useRef(activeStyle)

  draftRef.current = draft
  activeStyleRef.current = activeStyle

  const loadContent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (shareId) {
        const record = await fetchHighlightSetupShare(shareId)
        const nextDocument = record.document
          ? normalizeDocument(record.document as GraphicDocument)
          : createDocumentFromMarkdown(record.markdown || '')
        const nextConfig = mergeConfig(record.config)
        setDoc(nextDocument)
        setBaseConfig(nextConfig)
        setDraft(createHighlightPreviewDraft(nextConfig))
        setResolvedShareId(record.id)
        setResolvedProjectId(record.project_id ?? projectId ?? record.id)
        setCurrentPage(0)
        return
      }

      if (!projectId) throw new Error('缺少 shareId 或 projectId')

      const res = await fetch(`${agentHttpBase()}/v1/projects/${encodeURIComponent(projectId)}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error || `加载工程失败（${res.status}）`)
      }
      const data = (await res.json()) as {
        snapshot?: { document?: unknown; config?: unknown }
      }
      const nextDocument = normalizeDocument(
        (data.snapshot?.document as GraphicDocument | undefined) ?? {
          blocks: [],
          assets: {},
        },
      )
      const nextConfig = mergeConfig(
        data.snapshot?.config as Partial<GraphicTextConfig> | undefined,
      )
      setDoc(nextDocument)
      setBaseConfig(nextConfig)
      setDraft(createHighlightPreviewDraft(nextConfig))
      setResolvedProjectId(projectId)
      setResolvedShareId('')
      setCurrentPage(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setDoc(null)
    } finally {
      setLoading(false)
    }
  }, [projectId, shareId])

  useEffect(() => {
    void loadContent()
  }, [loadContent])

  useEffect(() => {
    const host = previewHostRef.current
    if (!host) return

    const measure = () => {
      const rect = host.getBoundingClientRect()
      const aspect = getGraphicLayout(baseConfig).aspectRatio
      // 以 zoom=1 的适配宽度为基准；放大后由滚动容器承接溢出
      const size = computeGraphicPageDisplaySize(
        aspect,
        Math.max(120, rect.width - 24),
        Math.max(160, rect.height - 24),
      )
      setBasePreviewWidth(size?.width)
    }

    measure()
    const observer = new ResizeObserver(() => measure())
    observer.observe(host)
    return () => observer.disconnect()
  }, [baseConfig, loading, doc])

  const previewWidth =
    basePreviewWidth != null ? Math.round(basePreviewWidth * zoom) : undefined

  const previewConfig = useMemo<GraphicTextConfig>(
    () => ({
      ...baseConfig,
      underlineHighlightColors: draft.underlineHighlightColors,
      handUnderlineHighlightColors: draft.handUnderlineHighlightColors,
      brushHighlightColors: draft.brushHighlightColors,
      quoteHighlightColors: draft.quoteHighlightColors,
      circleHighlightColors: draft.circleHighlightColors,
      highlightPickerColor: draft.highlightPickerColor,
    }),
    [baseConfig, draft],
  )

  const markdown = useMemo(() => (doc ? getDocumentMarkdown(doc) : ''), [doc])
  const pages = useMemo(
    () => (doc ? paginateDocument(doc, previewConfig) : []),
    [doc, previewConfig],
  )
  const pageCount = Math.max(1, pages.length)
  const safePageIndex = Math.min(currentPage, pageCount - 1)
  const activePage = pages[safePageIndex]

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(0, page), Math.max(0, pageCount - 1)))
  }, [pageCount])

  const applyPaintKey = useCallback(
    (key: string, mode: 'add' | 'remove') => {
      const stamp = `${mode}:${key}`
      if (paintKeysRef.current.has(stamp)) return
      paintKeysRef.current.add(stamp)

      const style = activeStyleRef.current
      const color = draftRef.current.highlightPickerColor
      setDraft((prev) => {
        const mapKey =
          style === 'underline' || style === 'handUnderline'
            ? 'underlineHighlightColors'
            : style === 'brush'
              ? 'brushHighlightColors'
              : style === 'quote'
                ? 'quoteHighlightColors'
                : 'circleHighlightColors'
        const nextMap = { ...prev[mapKey] }
        if (mode === 'remove') delete nextMap[key]
        else nextMap[key] = color
        return { ...prev, [mapKey]: nextMap }
      })
    },
    [],
  )

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

  const handleCharPointerDown = useCallback(
    (key: string, activeForStyle: boolean, event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const mode: 'add' | 'remove' = activeForStyle ? 'remove' : 'add'
      paintRef.current = { mode }
      paintKeysRef.current.clear()
      applyPaintKey(key, mode)
    },
    [applyPaintKey],
  )

  const handleCopyAndApply = async () => {
    if (!doc) return
    setBusy(true)
    setStatus(null)
    try {
      const maps = draftToMaps(draft)
      const ranges = highlightMapsToRanges(maps, plainTextByBlockIdFromDocument(doc))
      const payload = buildHighlightSetupPayload(resolvedProjectId || resolvedShareId, ranges)
      const clipboardText = serializeHighlightSetup(payload)

      let appliedLocally = false
      if (projectId && !shareId) {
        const res = await fetch(
          `${agentHttpBase()}/v1/projects/${encodeURIComponent(projectId)}/highlights`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ranges: toApplyHighlightRanges(ranges),
              replace: true,
            }),
          },
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error || `写入高亮失败（${res.status}）`)
        }
        appliedLocally = true
      }

      if (resolvedShareId) {
        await saveHighlightSetupResult(resolvedShareId, {
          resultRanges: ranges,
          resultClipboard: clipboardText,
        })
      }

      await copyText(clipboardText)
      setStatus(
        appliedLocally
          ? `已写入工程并复制 ${ranges.length} 处高亮。请把剪贴板内容发给 AI。`
          : `已保存并复制 ${ranges.length} 处高亮。请把剪贴板内容发给 AI。`,
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const idLabel = resolvedShareId
    ? `share: ${resolvedShareId}`
    : `project: ${resolvedProjectId || projectId || '-'}`

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden bg-neutral-100">
      <header className="flex shrink-0 flex-col gap-2 border-b border-neutral-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">高亮设置</p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            在下方真实预览文字上点击或滑动标记；字太小时可放大后滚动操作。
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-neutral-400">{idLabel}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {THEME_COLORS.map((color) => {
              const selected = draft.highlightPickerColor === color
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`颜色 ${color}`}
                  className={`size-7 shrink-0 rounded-full border-2 ${
                    selected ? 'border-neutral-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setDraft((prev) => ({ ...prev, highlightPickerColor: color }))}
                />
              )
            })}
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1">
            <button
              type="button"
              aria-label="缩小"
              disabled={zoom <= ZOOM_MIN}
              className="flex size-8 items-center justify-center rounded-full disabled:opacity-30"
              onClick={() => setZoom((value) => Math.max(ZOOM_MIN, Number((value - ZOOM_STEP).toFixed(2))))}
            >
              <ZoomOut size={16} />
            </button>
            <span className="min-w-12 text-center text-xs font-medium text-neutral-700">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="放大"
              disabled={zoom >= ZOOM_MAX}
              className="flex size-8 items-center justify-center rounded-full disabled:opacity-30"
              onClick={() => setZoom((value) => Math.min(ZOOM_MAX, Number((value + ZOOM_STEP).toFixed(2))))}
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              aria-label="重置比例"
              disabled={zoom === 1}
              className="flex size-8 items-center justify-center rounded-full disabled:opacity-30"
              onClick={() => setZoom(1)}
              title="重置比例"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto">
          {STYLE_TABS.map((tab) => {
            const selected = activeStyle === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                disabled={tab.disabled}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                  tab.disabled
                    ? 'cursor-not-allowed text-neutral-300'
                    : selected
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600'
                }`}
                onClick={() => {
                  if (!tab.disabled) setActiveStyle(tab.id)
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-500">
          <LoaderCircle className="size-4 animate-spin" />
          加载内容中…
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button
            type="button"
            className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm"
            onClick={() => void loadContent()}
          >
            重试
          </button>
        </div>
      ) : doc && activePage ? (
        <>
          <div
            ref={previewHostRef}
            className="highlight-setup-preview-scroll min-h-0 flex-1 overflow-auto overscroll-contain"
          >
            <div
              className="flex justify-center px-3 py-3"
              style={{
                minWidth: '100%',
                minHeight: '100%',
                alignItems: zoom > 1 ? 'flex-start' : 'center',
              }}
            >
              <div
                className="shrink-0"
                style={{
                  width: previewWidth ? `${previewWidth}px` : undefined,
                }}
              >
                <GraphicPage
                  page={activePage}
                  config={previewConfig}
                  markdown={markdown}
                  displayWidth={previewWidth}
                  className="rounded-xl shadow-lg"
                  highlightInteraction={{
                    activeStyle,
                    onCharPointerDown: handleCharPointerDown,
                  }}
                />
              </div>
            </div>
          </div>

          <footer className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                aria-label="上一页"
                disabled={safePageIndex <= 0}
                className="flex size-10 items-center justify-center rounded-full border border-neutral-200 disabled:opacity-30"
                onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
              >
                <ChevronLeft size={18} />
              </button>
              <p className="text-sm font-medium text-neutral-800">
                第 {safePageIndex + 1} / {pageCount} 页
              </p>
              <button
                type="button"
                aria-label="下一页"
                disabled={safePageIndex >= pageCount - 1}
                className="flex size-10 items-center justify-center rounded-full border border-neutral-200 disabled:opacity-30"
                onClick={() => setCurrentPage((page) => Math.min(pageCount - 1, page + 1))}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              type="button"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
              onClick={() => void handleCopyAndApply()}
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ClipboardCopy className="size-4" />
              )}
              复制并应用高亮配置
            </button>
            {status ? (
              <p className="mt-2 text-center text-xs leading-5 text-neutral-500">{status}</p>
            ) : (
              <p className="mt-2 text-center text-xs leading-5 text-neutral-400">
                可放大预览后滚动点选；连续画圈会合并成一圈
              </p>
            )}
          </footer>
        </>
      ) : null}
    </div>
  )
}
