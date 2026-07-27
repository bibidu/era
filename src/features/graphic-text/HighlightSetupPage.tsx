import { ChevronLeft, ChevronRight, ClipboardCopy, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  getDocumentMarkdown,
  normalizeDocument,
  parseScopedMarkdown,
  type GraphicDocument,
} from './document'
import { GraphicHighlightEditor } from './GraphicHighlightEditor'
import { stripHighlightMarkers } from './inlineHighlight'
import {
  createHighlightPreviewDraft,
  type HighlightPreviewDraft,
} from './GraphicTextConfigSheet'
import {
  DEFAULT_GRAPHIC_TEXT_CONFIG,
  type GraphicTextConfig,
} from './types'

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

export function HighlightSetupPage({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [document, setDocument] = useState<GraphicDocument | null>(null)
  const [config, setConfig] = useState<GraphicTextConfig>(DEFAULT_GRAPHIC_TEXT_CONFIG)
  const [draft, setDraft] = useState<HighlightPreviewDraft>(() =>
    createHighlightPreviewDraft(DEFAULT_GRAPHIC_TEXT_CONFIG),
  )
  const [pageCount, setPageCount] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadProject = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
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
      setDocument(nextDocument)
      setConfig(nextConfig)
      setDraft(createHighlightPreviewDraft(nextConfig))
      setCurrentPage(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setDocument(null)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadProject()
  }, [loadProject])

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), Math.max(1, pageCount)))
  }, [pageCount])

  const markdown = useMemo(
    () => (document ? getDocumentMarkdown(document) : ''),
    [document],
  )

  const handleCopyAndApply = async () => {
    if (!document) return
    setBusy(true)
    setStatus(null)
    try {
      const maps = draftToMaps(draft)
      const ranges = highlightMapsToRanges(maps, plainTextByBlockIdFromDocument(document))
      const payload = buildHighlightSetupPayload(projectId, ranges)
      const clipboardText = serializeHighlightSetup(payload)

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

      await copyText(clipboardText)
      setConfig((prev) => ({
        ...prev,
        ...maps,
        highlightPickerColor: draft.highlightPickerColor,
      }))
      setStatus(
        `已写入工程并复制 ${ranges.length} 处高亮配置。请把剪贴板内容粘贴发给 AI。`,
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 flex-col gap-1 border-b border-neutral-200 px-4 py-3">
        <p className="text-sm font-semibold text-neutral-900">高亮设置</p>
        <p className="text-xs leading-5 text-neutral-500">
          选择样式后，在标题/正文上点击或滑动标记。翻页查看各页，完成后点底部「复制并应用」，再把剪贴板内容发给
          AI。
        </p>
        <p className="truncate font-mono text-[11px] text-neutral-400">project: {projectId}</p>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-500">
          <LoaderCircle className="size-4 animate-spin" />
          加载工程中…
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button
            type="button"
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm"
            onClick={() => void loadProject()}
          >
            重试
          </button>
        </div>
      ) : document ? (
        <>
          <GraphicHighlightEditor
            markdown={markdown}
            document={document}
            config={config}
            underlineHighlightColors={draft.underlineHighlightColors}
            handUnderlineHighlightColors={draft.handUnderlineHighlightColors}
            brushHighlightColors={draft.brushHighlightColors}
            quoteHighlightColors={draft.quoteHighlightColors}
            circleHighlightColors={draft.circleHighlightColors}
            highlightPickerColor={draft.highlightPickerColor}
            hideHeader
            visiblePage={currentPage}
            onPageCountChange={setPageCount}
            onUnderlineChange={(colors) =>
              setDraft((prev) => ({ ...prev, underlineHighlightColors: colors }))
            }
            onHandUnderlineChange={(colors) =>
              setDraft((prev) => ({ ...prev, handUnderlineHighlightColors: colors }))
            }
            onBrushChange={(colors) =>
              setDraft((prev) => ({ ...prev, brushHighlightColors: colors }))
            }
            onQuoteChange={(colors) =>
              setDraft((prev) => ({ ...prev, quoteHighlightColors: colors }))
            }
            onCircleChange={(colors) =>
              setDraft((prev) => ({ ...prev, circleHighlightColors: colors }))
            }
            onPickerColorChange={(highlightPickerColor) =>
              setDraft((prev) => ({ ...prev, highlightPickerColor }))
            }
            onConfirm={() => void handleCopyAndApply()}
            onBack={() => undefined}
          />

          <footer className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                aria-label="上一页"
                disabled={currentPage <= 1}
                className="flex size-10 items-center justify-center rounded-full border border-neutral-200 disabled:opacity-30"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeft size={18} />
              </button>
              <p className="text-sm font-medium text-neutral-800">
                第 {currentPage} / {Math.max(1, pageCount)} 页
              </p>
              <button
                type="button"
                aria-label="下一页"
                disabled={currentPage >= pageCount}
                className="flex size-10 items-center justify-center rounded-full border border-neutral-200 disabled:opacity-30"
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
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
                点击后会真实写入工程，并把 AI 可识别的配置复制到剪贴板
              </p>
            )}
          </footer>
        </>
      ) : null}
    </div>
  )
}
