import { ChevronLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  SOCIAL_VIDEO_WORK_TYPES,
  deleteSocialVideoAnalysis,
  getSocialVideoAnalysis,
  patchSocialVideoAnalysis,
  type SocialVideoAnalysisRecord,
  type SocialVideoExtractStatus,
  type SocialVideoWorkType,
} from '../../agent/supabaseSocialVideoAnalysis'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack'
import { MarkdownPreview } from './MarkdownPreview'
import { truncateText } from './parseMarkdownMetrics'

interface SocialVideoPostPageProps {
  record: SocialVideoAnalysisRecord
  onBack: () => void
  onDeleted?: () => void
  onUpdated?: () => void
  flushTop?: boolean
}

type DetailTab = 'detail' | 'data'

const fieldClass =
  'w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-300'
const fieldStyle = {
  borderColor: 'var(--era-border)',
  background: 'var(--era-input)',
  color: 'var(--era-fg)',
} as const

function extractStatusTagStyle(status: SocialVideoExtractStatus): {
  background: string
  color: string
} {
  switch (status) {
    case '提取成功':
      return { background: 'rgb(22 163 74 / 0.92)', color: '#ffffff' }
    case '提取中':
      return { background: 'rgb(59 130 246 / 0.95)', color: '#ffffff' }
    case '提取失败':
      return { background: 'rgb(220 38 38 / 0.9)', color: '#ffffff' }
    default:
      return { background: 'rgb(0 0 0 / 0.55)', color: '#ffffff' }
  }
}

function prettyExtractData(markdown: string | undefined) {
  const trimmed = (markdown || '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2)
    } catch {
      return trimmed
    }
  }
  return trimmed
}

/** 帖子详情：详情 / 数据 Tab */
export function SocialVideoPostPage({
  record,
  onBack,
  onDeleted,
  onUpdated,
  flushTop = false,
}: SocialVideoPostPageProps) {
  const [tab, setTab] = useState<DetailTab>('detail')
  const [view, setView] = useState<SocialVideoAnalysisRecord>(record)
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [viewerSource, setViewerSource] = useState<'content' | 'extract'>('content')
  const [savingType, setSavingType] = useState(false)
  const swipe = useEdgeSwipeBack(onBack, { enabled: flushTop && !confirmOpen && viewerIndex == null })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const full = await getSocialVideoAnalysis(record.id)
        if (cancelled) return
        setView(full)
        setStatusMessage('')
      } catch (error) {
        if (!cancelled) {
          setView(record)
          setStatusMessage(error instanceof Error ? error.message : '加载失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [record])

  const contentPreviews = useMemo(() => {
    const fromField = (view.image_previews || []).filter(Boolean)
    if (fromField.length > 0) return fromField
    const cover = (view.cover_url || '').trim()
    return cover ? [cover] : []
  }, [view.cover_url, view.image_previews])

  const extractImages = useMemo(
    () => (view.extract_images || []).filter(Boolean),
    [view.extract_images],
  )

  const extractText = useMemo(() => prettyExtractData(view.markdown), [view.markdown])
  const contentPreview = (view.markdown || '').trim()
    ? truncateText((view.markdown || '').replace(/\s+/g, ' '), 80)
    : '暂无内容'
  const showExtractData = view.extract_status !== '未开始'

  async function handleWorkTypeChange(next: SocialVideoWorkType) {
    if (savingType || next === view.work_type) return
    setSavingType(true)
    try {
      const updated = await patchSocialVideoAnalysis(view.id, { workType: next })
      setView(updated)
      onUpdated?.()
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '更新类型失败')
    } finally {
      setSavingType(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteSocialVideoAnalysis(view.id)
      setConfirmOpen(false)
      onDeleted?.()
      onBack()
    } catch (error) {
      setStatusMessage(error instanceof Error ? `删除失败：${error.message}` : '删除失败')
      setDeleting(false)
    }
  }

  return (
    <div
      ref={swipe.ref}
      className="flex min-h-0 flex-1 flex-col"
      style={{ background: 'var(--era-bg)', color: 'var(--era-fg)', ...swipe.style }}
      onPointerDown={swipe.onPointerDown}
      onPointerMove={swipe.onPointerMove}
      onPointerUp={swipe.onPointerUp}
      onPointerCancel={swipe.onPointerCancel}
    >
      <header
        className="flex shrink-0 items-center gap-2 border-b px-3"
        style={{
          borderColor: 'var(--era-border)',
          paddingTop: flushTop
            ? 'calc(0.75rem + env(safe-area-inset-top, 0px))'
            : '0.75rem',
          paddingBottom: '0.75rem',
          background: flushTop ? 'var(--era-header)' : undefined,
        }}
      >
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full"
          style={{ background: 'var(--era-panel)' }}
          aria-label="返回"
          onClick={onBack}
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="min-w-0 flex-1 text-base font-semibold">帖子详情</h1>
      </header>

      <div
        className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5"
        style={{ borderColor: 'var(--era-border)', background: 'var(--era-bg)' }}
        role="tablist"
        aria-label="帖子详情切换"
      >
        {(
          [
            ['detail', '详情'],
            ['data', '数据'],
          ] as const
        ).map(([id, label]) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition"
              style={
                active
                  ? { background: 'var(--era-button)', color: 'var(--era-button-fg)' }
                  : {
                      background: 'var(--era-panel)',
                      color: 'var(--era-muted)',
                      border: '1px solid var(--era-border)',
                    }
              }
              onClick={() => setTab(id)}
            >
              {label}
              {id === 'data' ? (
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                  style={extractStatusTagStyle(view.extract_status)}
                >
                  {view.extract_status}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm" style={{ color: 'var(--era-muted)' }}>
            加载中...
          </div>
        ) : tab === 'detail' ? (
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">类型</span>
              <select
                className={fieldClass}
                style={fieldStyle}
                value={view.work_type}
                disabled={savingType}
                onChange={(event) => void handleWorkTypeChange(event.target.value as SocialVideoWorkType)}
              >
                {SOCIAL_VIDEO_WORK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">标题</span>
              <div className={fieldClass} style={fieldStyle}>
                {view.title?.trim() || '未填写标题'}
              </div>
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">图片预览（{contentPreviews.length}）</span>
              {contentPreviews.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--era-muted)' }}>
                  暂无图片
                </p>
              ) : (
                <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                  {contentPreviews.map((src, index) => (
                    <button
                      key={`${src}-${index}`}
                      type="button"
                      className="aspect-[9/16] w-[42%] max-w-[11rem] shrink-0 overflow-hidden rounded-2xl border"
                      style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
                      onClick={() => {
                        setViewerSource('content')
                        setViewerIndex(index)
                      }}
                    >
                      <img src={src} alt={`预览 ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">内容</span>
              <div className={fieldClass} style={{ ...fieldStyle, color: 'var(--era-muted)' }}>
                {contentPreview}
              </div>
            </div>

            {statusMessage ? (
              <p className="text-sm" style={{ color: 'var(--era-muted)' }}>
                {statusMessage}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            {!showExtractData ? (
              <p className="text-sm" style={{ color: 'var(--era-muted)' }}>
                尚未开始数据提取。请到智能提取页创建任务。
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">上传图片（{extractImages.length}）</span>
                  {extractImages.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--era-muted)' }}>
                      暂无提取图片
                    </p>
                  ) : (
                    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                      {extractImages.map((src, index) => (
                        <button
                          key={`${src}-${index}`}
                          type="button"
                          className="aspect-[9/16] w-[calc(50%-0.4rem)] max-w-[14rem] shrink-0 overflow-hidden rounded-2xl border"
                          style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
                          onClick={() => {
                            setViewerSource('extract')
                            setViewerIndex(index)
                          }}
                        >
                          <img
                            src={src}
                            alt={`提取图 ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">提取数据</span>
                  <div
                    className="overflow-y-auto rounded-2xl border p-4"
                    style={{
                      ...fieldStyle,
                      height: '80vh',
                      maxHeight: '80vh',
                    }}
                  >
                    {extractText ? (
                      view.markdown?.trim().startsWith('{') || view.markdown?.trim().startsWith('[') ? (
                        <pre className="font-mono text-xs leading-5 whitespace-pre-wrap break-words">
                          {extractText}
                        </pre>
                      ) : (
                        <MarkdownPreview value={view.markdown || ''} />
                      )
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--era-muted)' }}>
                        {view.extract_status === '提取中' ? '提取中，请稍后刷新查看…' : '暂无提取结果'}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div
        className="shrink-0 border-t px-4 py-3"
        style={{
          borderColor: 'var(--era-border)',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          background: 'var(--era-bg)',
        }}
      >
        <button
          type="button"
          className="h-12 w-full rounded-2xl text-sm font-bold transition hover:opacity-90 disabled:opacity-40"
          style={{
            background: 'rgb(220 38 38 / 0.14)',
            color: 'rgb(252 165 165)',
            border: '1px solid rgb(239 68 68 / 0.35)',
          }}
          disabled={deleting || loading}
          onClick={() => setConfirmOpen(true)}
        >
          删除
        </button>
      </div>

      {viewerIndex != null ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/92"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewerIndex(null)}
        >
          <div className="flex items-center justify-between px-3 py-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white"
              aria-label="返回"
              onClick={() => setViewerIndex(null)}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-white">
              {viewerIndex + 1} / {(viewerSource === 'extract' ? extractImages : contentPreviews).length}
            </span>
            <span className="size-9" />
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-6" onClick={(e) => e.stopPropagation()}>
            <img
              src={(viewerSource === 'extract' ? extractImages : contentPreviews)[viewerIndex]}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="确认删除这条帖子？"
        description="删除后无法恢复，分析数据将从库中移除。"
        confirmLabel="确认删除"
        cancelLabel="取消"
        destructive
        confirming={deleting}
        onCancel={() => {
          if (!deleting) setConfirmOpen(false)
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
