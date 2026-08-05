import { ChevronLeft, Download } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { legacyEdgeFunctionUrl } from '../../agent/legacyEdgeFunctionUrl'
import { LEGACY_SUPABASE_ANON_KEY } from '../../agent/supabaseHighlightSetup'
import {
  SOCIAL_VIDEO_WORK_TYPES,
  getSocialVideoAnalysis,
  patchSocialVideoAnalysis,
  type SocialVideoAnalysisRecord,
  type SocialVideoExtractStatus,
  type SocialVideoWorkType,
} from '../../agent/supabaseSocialVideoAnalysis'
import { BottomSheet } from '../../components/BottomSheet'
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack'
import { FullscreenImageViewer } from './FullscreenImageViewer'
import { MarkdownPreview } from './MarkdownPreview'
import {
  preparePreviewImagesForShare,
  sharePreparedImagesToPhotos,
  type PreviewImageItem,
} from './downloadImagesAsZip'
import { describePhotosShareBlocker, isPhotosShareAvailable } from './photosShareEnv'
import { truncateText } from './parseMarkdownMetrics'

interface SocialVideoPostPageProps {
  record: SocialVideoAnalysisRecord
  onBack: () => void
  onUpdated?: (next?: SocialVideoAnalysisRecord) => void
  flushTop?: boolean
}

type DetailTab = 'detail' | 'data'

const MAX_MEDIA_ITEMS = 12
const FRAME_MAX_WIDTH = 720
const FRAME_JPEG_QUALITY = 0.72

const fieldClass =
  'w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-300'
const fieldStyle = {
  borderColor: 'var(--era-border)',
  background: 'var(--era-input)',
  color: 'var(--era-fg)',
} as const
const panelStyle = {
  borderColor: 'var(--era-border)',
  background: 'var(--era-panel)',
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('图片读取失败。'))
    }
    reader.onerror = () => reject(new Error('图片读取失败。'))
    reader.readAsDataURL(file)
  })
}

async function compressImageFile(file: File) {
  const rawUrl = await readFileAsDataUrl(file)
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`无法解析图片：${file.name}`))
    img.src = rawUrl
  })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法压缩图片。')
  const scale = Math.min(1, FRAME_MAX_WIDTH / Math.max(image.naturalWidth || image.width, 1))
  canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale))
  canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale))
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', FRAME_JPEG_QUALITY)
}

function mergeRecord(
  prev: SocialVideoAnalysisRecord,
  next: SocialVideoAnalysisRecord,
): SocialVideoAnalysisRecord {
  if (prev.id !== next.id) return next
  return {
    ...prev,
    ...next,
    markdown: next.markdown ?? prev.markdown,
    outline: next.outline ?? prev.outline,
    image_previews: next.image_previews ?? prev.image_previews,
    extract_images: next.extract_images ?? prev.extract_images,
    extract_data: next.extract_data ?? prev.extract_data,
    cover_url: next.cover_url ?? prev.cover_url,
  }
}

/** 帖子详情：详情 / 数据 */
export function SocialVideoPostPage({
  record,
  onBack,
  onUpdated,
  flushTop = false,
}: SocialVideoPostPageProps) {
  const [tab, setTab] = useState<DetailTab>('detail')
  const [view, setView] = useState<SocialVideoAnalysisRecord>(record)
  const [statusMessage, setStatusMessage] = useState('')
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [viewerImages, setViewerImages] = useState<PreviewImageItem[]>([])
  const [savingType, setSavingType] = useState(false)
  const [contentSheetOpen, setContentSheetOpen] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [downloadStatus, setDownloadStatus] = useState('')
  const [preparedContentFiles, setPreparedContentFiles] = useState<(File | null)[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadInputId = useId()

  const swipe = useEdgeSwipeBack(onBack, {
    enabled: viewerIndex == null && !contentSheetOpen,
  })

  useEffect(() => {
    setView((prev) => mergeRecord(prev, record))
  }, [record])

  const onUpdatedRef = useRef(onUpdated)
  onUpdatedRef.current = onUpdated

  useEffect(() => {
    if (view.extract_status !== '提取中') return
    let cancelled = false
    const tick = async () => {
      try {
        const full = await getSocialVideoAnalysis(view.id)
        if (cancelled) return
        setView((prev) => mergeRecord(prev, full))
        onUpdatedRef.current?.(full)
      } catch {
        // 轮询失败不打扰
      }
    }
    const timer = window.setInterval(() => {
      void tick()
    }, 4000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [view.extract_status, view.id])

  const contentPreviews = useMemo(() => {
    const fromField = (view.image_previews || []).filter(Boolean)
    if (fromField.length > 0) return fromField
    const cover = (view.cover_url || '').trim()
    return cover ? [cover] : []
  }, [view.cover_url, view.image_previews])

  const contentPreviewItems = useMemo<PreviewImageItem[]>(
    () => contentPreviews.map((src, index) => ({ src, alt: `预览 ${index + 1}` })),
    [contentPreviews],
  )

  const extractImages = useMemo(
    () => (view.extract_images || []).filter(Boolean),
    [view.extract_images],
  )

  const extractPreviewItems = useMemo<PreviewImageItem[]>(
    () => extractImages.map((src, index) => ({ src, alt: `提取图 ${index + 1}` })),
    [extractImages],
  )

  const extractRaw = useMemo(() => {
    const data = (view.extract_data || '').trim()
    if (data) return data
    const md = (view.markdown || '').trim()
    if (md.startsWith('{') || md.startsWith('[')) return md
    return ''
  }, [view.extract_data, view.markdown])
  const extractText = useMemo(() => prettyExtractData(extractRaw), [extractRaw])
  const contentSource = (view.markdown || '').trim()
  const contentPreview = contentSource
    ? truncateText(contentSource.replace(/\s+/g, ' '), 80)
    : '暂无内容'

  const showUploadForm =
    view.extract_status === '未开始' || view.extract_status === '提取失败'
  const showCreateTask = view.extract_status === '未开始' || view.extract_status === '提取失败'

  useEffect(() => {
    let cancelled = false
    setPreparedContentFiles([])
    if (contentPreviewItems.length === 0) return
    void (async () => {
      const result = await preparePreviewImagesForShare(contentPreviewItems)
      if (!cancelled) setPreparedContentFiles(result.filesByIndex)
    })()
    return () => {
      cancelled = true
    }
  }, [contentPreviewItems])

  useEffect(() => {
    const urls = imageFiles.map((file) => URL.createObjectURL(file))
    setImagePreviewUrls(urls)
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [imageFiles])

  async function handleWorkTypeChange(next: SocialVideoWorkType) {
    if (savingType || next === view.work_type) return
    setSavingType(true)
    try {
      const updated = await patchSocialVideoAnalysis(view.id, { workType: next })
      setView(updated)
      onUpdated?.(updated)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '更新类型失败')
    } finally {
      setSavingType(false)
    }
  }

  async function handleDownloadContentImages() {
    if (!isPhotosShareAvailable()) {
      setDownloadStatus(describePhotosShareBlocker())
      return
    }
    const files = preparedContentFiles.filter((file): file is File => Boolean(file))
    if (files.length === 0) {
      setDownloadStatus('图片准备中，请稍后再试')
      return
    }
    try {
      await sharePreparedImagesToPhotos(files)
      setDownloadStatus('请选择「存储到照片」')
      window.setTimeout(() => setDownloadStatus(''), 2200)
    } catch (error) {
      setDownloadStatus(error instanceof Error ? error.message : '保存失败')
    }
  }

  async function handleCreateTask() {
    if (isCreating) return
    if (imageFiles.length === 0) {
      setStatusMessage('请先上传图片')
      return
    }
    setIsCreating(true)
    setStatusMessage('正在创建分析任务...')
    try {
      const images = []
      for (const file of imageFiles.slice(0, MAX_MEDIA_ITEMS)) {
        images.push(await compressImageFile(file))
      }
      const response = await fetch(legacyEdgeFunctionUrl('create-extract-task'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: LEGACY_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${LEGACY_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ items: [{ postId: view.id, images }] }),
      })
      const text = await response.text()
      let data: { ok?: boolean; error?: string } = {}
      if (text) {
        try {
          data = JSON.parse(text) as typeof data
        } catch {
          throw new Error(text.slice(0, 240) || `HTTP ${response.status}`)
        }
      }
      if (!response.ok || data.error) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      setImageFiles([])
      setStatusMessage('')
      setSuccessToast('创建分析任务成功')
      const full = await getSocialVideoAnalysis(view.id)
      setView(full)
      onUpdated?.(full)
      window.setTimeout(() => {
        setSuccessToast(null)
        setTab('data')
      }, 1000)
    } catch (error) {
      setStatusMessage(error instanceof Error ? `创建失败：${error.message}` : '创建失败')
    } finally {
      setIsCreating(false)
    }
  }

  function openViewer(images: PreviewImageItem[], index: number) {
    setViewerImages(images)
    setViewerIndex(index)
  }

  function handlePickFiles(fileList: FileList | null) {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'))
    setImageFiles(files.slice(0, MAX_MEDIA_ITEMS))
  }

  function renderUploadZone() {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <button
          type="button"
          className="relative flex min-h-[12rem] flex-1 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed px-4 py-8 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          style={panelStyle}
          disabled={isCreating}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            id={uploadInputId}
            ref={fileInputRef}
            className="sr-only"
            accept="image/*"
            type="file"
            multiple
            disabled={isCreating}
            onChange={(event) => {
              handlePickFiles(event.target.files)
              event.target.value = ''
            }}
          />
          <span className="text-sm font-medium">上传图片</span>
          <span className="text-xs" style={{ color: 'var(--era-muted)' }}>
            {imageFiles.length > 0 ? `已选 ${imageFiles.length} 张` : '点击选择'}
          </span>
          {imagePreviewUrls.length > 0 ? (
            <div className="mt-2 grid w-full max-w-sm grid-cols-3 gap-2">
              {imagePreviewUrls.map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className="aspect-[27/32] overflow-hidden rounded-xl border"
                  style={{ borderColor: 'var(--era-border)', background: 'var(--era-input)' }}
                >
                  <img src={src} alt={`待分析 ${index + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </button>
      </div>
    )
  }

  const tabButtonStyle = (active: boolean) =>
    active
      ? {
          background: 'var(--era-panel)',
          color: 'var(--era-fg)',
          boxShadow: '0 1px 2px rgb(0 0 0 / 0.12)',
        }
      : { background: 'transparent', color: 'var(--era-muted)' }

  return (
    <div
      ref={swipe.ref}
      className="relative flex min-h-0 flex-1 flex-col"
      style={{ background: 'var(--era-bg)', color: 'var(--era-fg)', ...swipe.style }}
      onPointerDown={swipe.onPointerDown}
      onPointerMove={swipe.onPointerMove}
      onPointerUp={swipe.onPointerUp}
      onPointerCancel={swipe.onPointerCancel}
    >
      {successToast ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-6">
          <div
            className="rounded-3xl border px-6 py-5 text-center text-base font-semibold shadow-lg"
            style={{ ...panelStyle, color: 'var(--era-fg)' }}
          >
            {successToast}
          </div>
        </div>
      ) : null}

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
        className="flex shrink-0 items-center justify-center border-b px-4 py-2.5"
        style={{ borderColor: 'var(--era-border)', background: 'var(--era-bg)' }}
      >
        <div
          className="grid w-[60%] grid-cols-2 items-center rounded-full border p-1"
          style={{
            borderColor: 'var(--era-border)',
            background: 'var(--era-input)',
          }}
          role="tablist"
          aria-label="帖子详情切换"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'detail'}
            className="rounded-full px-3 py-1.5 text-sm font-medium transition"
            style={tabButtonStyle(tab === 'detail')}
            onClick={() => setTab('detail')}
          >
            详情
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'data'}
            className="relative rounded-full px-3 py-1.5 text-sm font-medium transition"
            style={tabButtonStyle(tab === 'data')}
            onClick={() => setTab('data')}
          >
            数据
            <span
              className="pointer-events-none absolute -right-1.5 -top-1.5 z-10 max-w-[5.5rem] truncate rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none tracking-wide shadow-sm"
              style={extractStatusTagStyle(view.extract_status)}
            >
              {view.extract_status}
            </span>
          </button>
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 px-4 py-4 ${
          tab === 'data' ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {tab === 'detail' ? (
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
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">图片预览（{contentPreviews.length}）</span>
                {contentPreviews.length > 0 ? (
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-full transition hover:opacity-80 disabled:opacity-40"
                    style={{ color: 'var(--era-fg)' }}
                    aria-label="保存到相册"
                    disabled={preparedContentFiles.every((file) => !file)}
                    onClick={() => void handleDownloadContentImages()}
                  >
                    <Download size={18} strokeWidth={2.25} />
                  </button>
                ) : null}
              </div>
              {contentPreviews.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--era-muted)' }}>
                  暂无图片
                </p>
              ) : (
                <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                  {contentPreviewItems.map((image, index) => (
                    <button
                      key={`${image.src}-${index}`}
                      type="button"
                      className="aspect-[9/16] w-[42%] max-w-[11rem] shrink-0 overflow-hidden rounded-2xl border"
                      style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
                      onClick={() => openViewer(contentPreviewItems, index)}
                    >
                      <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {downloadStatus ? (
                <p className="text-xs" style={{ color: 'var(--era-muted)' }}>
                  {downloadStatus}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">内容</span>
              <button
                type="button"
                className={`${fieldClass} text-left`}
                style={{ ...fieldStyle, color: 'var(--era-muted)' }}
                onClick={() => setContentSheetOpen(true)}
              >
                {contentPreview}
              </button>
            </div>

            {statusMessage && tab === 'detail' ? (
              <p className="text-sm" style={{ color: 'var(--era-muted)' }}>
                {statusMessage}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col gap-3">
            {showUploadForm ? renderUploadZone() : null}

            {!showUploadForm ? (
              <>
                <div className="flex shrink-0 flex-col gap-2">
                  <span className="text-sm font-medium">上传图片（{extractImages.length}）</span>
                  {extractImages.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--era-muted)' }}>
                      暂无提取图片
                    </p>
                  ) : (
                    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                      {extractPreviewItems.map((image, index) => (
                        <button
                          key={`${image.src}-${index}`}
                          type="button"
                          className="aspect-[27/32] w-[calc(50%-0.4rem)] max-w-[14rem] shrink-0 overflow-hidden rounded-2xl border"
                          style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
                          onClick={() => openViewer(extractPreviewItems, index)}
                        >
                          <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2">
                  <span className="shrink-0 text-sm font-medium">提取数据</span>
                  <div
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border p-4"
                    style={fieldStyle}
                  >
                    {extractText ? (
                      extractRaw.startsWith('{') || extractRaw.startsWith('[') ? (
                        <pre className="font-mono text-xs leading-5 whitespace-pre-wrap break-words">
                          {extractText}
                        </pre>
                      ) : (
                        <MarkdownPreview value={extractRaw} />
                      )
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--era-muted)' }}>
                        {view.extract_status === '提取中' ? '提取中，请稍后查看…' : '暂无提取结果'}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {statusMessage && tab === 'data' ? (
              <p className="shrink-0 text-sm" style={{ color: 'var(--era-muted)' }}>
                {statusMessage}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {tab === 'data' && showCreateTask ? (
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
            className="h-12 w-full rounded-2xl text-sm font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--era-button)', color: 'var(--era-button-fg)' }}
            disabled={isCreating || imageFiles.length === 0}
            onClick={() => void handleCreateTask()}
          >
            {isCreating ? '创建中...' : '创建分析任务'}
          </button>
        </div>
      ) : null}

      <BottomSheet
        isOpen={contentSheetOpen}
        onOpenChange={setContentSheetOpen}
        dialogClassName="!max-h-[50vh]"
        dialogStyle={{ height: '50vh', maxHeight: '50vh' }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div
            className="flex shrink-0 items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--era-border)' }}
          >
            <h2 className="text-sm font-semibold">内容预览</h2>
            <button
              type="button"
              className="text-xs font-semibold"
              style={{ color: 'var(--era-muted)' }}
              onClick={() => setContentSheetOpen(false)}
            >
              关闭
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {contentSource ? (
              <MarkdownPreview value={contentSource} />
            ) : (
              <p className="text-sm" style={{ color: 'var(--era-muted)' }}>
                暂无内容
              </p>
            )}
          </div>
        </div>
      </BottomSheet>

      {viewerIndex != null ? (
        <FullscreenImageViewer
          images={viewerImages}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          enableDownload
        />
      ) : null}
    </div>
  )
}
