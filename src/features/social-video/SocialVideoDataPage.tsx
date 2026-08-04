import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { legacyEdgeFunctionUrl } from '../../agent/legacyEdgeFunctionUrl'
import { LEGACY_SUPABASE_ANON_KEY } from '../../agent/supabaseHighlightSetup'
import {
  getSocialVideoAnalysis,
  listSocialVideoAnalyses,
  updateSocialVideoAnalysis,
  type SocialVideoAnalysisRecord,
  type SocialVideoWorkType,
} from '../../agent/supabaseSocialVideoAnalysis'
import { truncateText } from './parseMarkdownMetrics'

const DEFAULT_MODEL = 'qwen3.7-flash'
const DEFAULT_FPS = 1
const BATCH_CONCURRENCY = 7
/** 过多/过大的 base64 帧会打爆 Supabase Edge Function（WORKER_RESOURCE_LIMIT） */
const MAX_FRAME_COUNT = 10
const FRAME_MAX_WIDTH = 512
const FRAME_JPEG_QUALITY = 0.58
/** data URL 合计字符上限（约 2.2MB），超出则降质/减帧 */
const MAX_FRAMES_PAYLOAD_CHARS = 2_200_000
const VIDEO_EVENT_TIMEOUT_MS = 10000

const NETWORK_ERROR_MARKERS = ['failed to fetch', 'networkerror', 'load failed', 'type error']

const EXTRACT_TYPE_OPTIONS: SocialVideoWorkType[] = ['图文', '风水']

const EMPTY_EXTRACT_SCHEMA = {
  话题: '',
  发布日期: '',
  流量激励文案: '',
  播放量: '',
  点赞量: '',
  评论量: '',
  分享量: '',
  收藏量: '',
  划走率: '',
  文案展开率: '',
  评论浏览图片数: '',
  涨粉量: '',
  脱粉量: '',
  粉丝播放占比: '',
  封面点击率: '',
  平均浏览图片数: '',
  文案读完率: '',
  平均进入率: '',
  点赞率: '',
  评论率: '',
  下载量: '',
  收藏率: '',
  分享率: '',
  不感兴趣率: '',
  流量来源_推荐页: '',
  流量来源_个人主页: '',
  流量来源_朋友页: '',
  流量来源_搜索页: '',
  流量来源_关注页: '',
  平台扶持流量: '',
  吸粉量: '',
  吸粉率: '',
  脱粉率: '',
  不感兴趣量: '',
  观众兴趣_最多: '',
  观众喜欢_关注的同类作者: [] as string[],
  观众常搜的搜索词: [] as string[],
  观众喜欢的话题: [] as string[],
  观众特征总结_性别年龄: '',
  观众特征总结_地域: '',
  观众特征总结_兴趣职业: '',
  观众区域_最多: '',
  观众城市等级_最多: '',
  观众性别男性占比: '',
  观众年龄_最多: '',
  观众职业: [] as string[],
}

const DEFAULT_PROMPT = `你只需要按照如下JSON的key提取信息，并将指标数据填到对应的value中，如果没有发现该数据则填写未知。
完整待提取的JSON数据是：

${JSON.stringify(EMPTY_EXTRACT_SCHEMA, null, 2)}`

interface SocialVideoProxyResponse {
  markdown?: string
  error?: string
  code?: string
  requestId?: string | null
  message?: string
}

interface MediaInput {
  type: 'image' | 'video'
  url: string
  fps?: number
}

interface ExtractJob {
  id: string
  relatedPostId: string
  videoFile: File | null
  resultText: string
  resultData: unknown | null
  status: string
  isLoading: boolean
  resultExpanded: boolean
}

interface SocialVideoDataPageProps {
  embedded?: boolean
  onSaved?: () => void
  /** 供外层顶栏挂载「批量提取」按钮 */
  onBatchExtractReady?: (api: { run: () => void; busy: boolean } | null) => void
}

function createJob(): ExtractJob {
  return {
    id: crypto.randomUUID(),
    relatedPostId: '',
    videoFile: null,
    resultText: '',
    resultData: null,
    status: '',
    isLoading: false,
    resultExpanded: false,
  }
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  eventName: 'loadedmetadata' | 'loadeddata' | 'seeked',
  timeoutMs = VIDEO_EVENT_TIMEOUT_MS,
) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeout)
      video.removeEventListener(eventName, handleEvent)
      video.removeEventListener('error', handleError)
    }
    const handleEvent = () => {
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error('视频解析失败，请更换视频后重试。'))
    }
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('视频抽帧超时，请缩短视频或降低复杂度后重试。'))
    }, timeoutMs)

    video.addEventListener(eventName, handleEvent, { once: true })
    video.addEventListener('error', handleError, { once: true })
  })
}

async function waitForVideoFrame(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return
  }

  try {
    await waitForVideoEvent(video, 'loadeddata', 3000)
  } catch {
    // Some mobile browsers do not fire loadeddata for object URLs until seeking.
  }
}

async function seekVideo(video: HTMLVideoElement, time: number) {
  const targetTime = Math.min(Math.max(time, 0.001), Math.max(video.duration - 0.05, 0.001))

  if (Math.abs(video.currentTime - targetTime) < 0.01) {
    await waitForVideoFrame(video)
    return
  }

  const seeked = waitForVideoEvent(video, 'seeked')
  video.currentTime = targetTime
  await seeked
}

function framePayloadChars(frames: string[]) {
  return frames.reduce((sum, frame) => sum + frame.length, 0)
}

async function extractVideoFrames(file: File, fps: number) {
  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = objectUrl
  video.load()

  try {
    await waitForVideoEvent(video, 'loadedmetadata')
    await waitForVideoFrame(video)

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1
    let frameCount = Math.max(1, Math.min(MAX_FRAME_COUNT, Math.ceil(duration * fps)))
    let maxWidth = FRAME_MAX_WIDTH
    let quality = FRAME_JPEG_QUALITY

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('当前浏览器无法抽取视频帧。')
    }

    const capture = async () => {
      const times =
        frameCount === 1
          ? [0]
          : Array.from({ length: frameCount }, (_, index) => (duration * index) / (frameCount - 1))
      const frames: string[] = []

      for (const time of times) {
        await seekVideo(video, time)

        if (!video.videoWidth || !video.videoHeight) {
          throw new Error('无法读取视频画面尺寸。')
        }

        const scale = Math.min(1, maxWidth / video.videoWidth)
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        frames.push(canvas.toDataURL('image/jpeg', quality))
      }

      return frames
    }

    let frames = await capture()
    for (let attempt = 0; attempt < 4 && framePayloadChars(frames) > MAX_FRAMES_PAYLOAD_CHARS; attempt++) {
      if (quality > 0.42) {
        quality = Math.max(0.4, quality - 0.1)
      } else if (maxWidth > 360) {
        maxWidth = 360
      } else if (frameCount > 5) {
        frameCount = Math.max(5, Math.ceil(frameCount * 0.7))
      } else {
        break
      }
      frames = await capture()
    }

    if (framePayloadChars(frames) > MAX_FRAMES_PAYLOAD_CHARS) {
      throw new Error('视频抽帧后体积仍过大，无法通过代理调用。请缩短视频后重试。')
    }

    return frames
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function isLikelyNetworkOrCorsError(message: string) {
  const normalized = message.toLowerCase()
  return NETWORK_ERROR_MARKERS.some((marker) => normalized.includes(marker))
}

/** 关联帖子下拉展示：优先标题，否则大纲，最长 30 字 */
function relatedPostLabel(record: SocialVideoAnalysisRecord) {
  const text = (record.title || '').trim() || (record.outline || '').trim() || '未命名帖子'
  return truncateText(text, 30)
}

function parseModelJson(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('模型未返回内容')
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    // continue
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim())
    } catch {
      // continue
    }
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1))
    } catch {
      // continue
    }
  }

  throw new Error('模型未返回合法 JSON，请重试提取')
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  let cursor = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      await worker(items[index], index)
    }
  })
  await Promise.all(runners)
}

async function requestExtract(videoFile: File, prompt: string) {
  const frames = await extractVideoFrames(videoFile, DEFAULT_FPS)
  const media: MediaInput[] = frames.map((url) => ({ type: 'image', url }))

  const response = await fetch(legacyEdgeFunctionUrl('dashscope-video-extract'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: LEGACY_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${LEGACY_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      media,
      fps: DEFAULT_FPS,
      prompt: prompt.trim(),
    }),
  })

  const text = await response.text()
  let data: SocialVideoProxyResponse = {}
  if (text) {
    try {
      data = JSON.parse(text) as SocialVideoProxyResponse
    } catch {
      throw new Error(text.slice(0, 240) || `HTTP ${response.status}`)
    }
  }

  if (!response.ok) {
    const message = data.error || data.message || text || `HTTP ${response.status}`
    if (response.status === 401) {
      throw new Error(
        '鉴权失败（401）：Supabase 代理或 DashScope API Key 无效。请检查密钥后重试。',
      )
    }
    if (
      data.code === 'WORKER_RESOURCE_LIMIT' ||
      message.includes('WORKER_RESOURCE_LIMIT') ||
      message.includes('not having enough compute resources')
    ) {
      throw new Error('视频帧过大导致代理函数资源不足。请缩短视频后重试。')
    }
    throw new Error(message)
  }

  const raw = data.markdown || JSON.stringify(data, null, 2)
  const parsed = parseModelJson(raw)
  return {
    raw,
    parsed,
    requestId: data.requestId || null,
  }
}

function formatResultPreview(resultData: unknown, resultText: string) {
  if (resultData != null) {
    try {
      return JSON.stringify(resultData, null, 2)
    } catch {
      // fall through
    }
  }
  return resultText
}

function readPublishDate(resultData: unknown) {
  if (!resultData || typeof resultData !== 'object' || Array.isArray(resultData)) return ''
  const value = (resultData as Record<string, unknown>)['发布日期']
  return typeof value === 'string' ? value.trim() : ''
}

export function SocialVideoDataPage({
  embedded = false,
  onSaved,
  onBatchExtractReady,
}: SocialVideoDataPageProps) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [workTypeFilter, setWorkTypeFilter] = useState<SocialVideoWorkType>('图文')
  const [jobs, setJobs] = useState<ExtractJob[]>(() => [createJob(), createJob(), createJob()])
  const [pendingPosts, setPendingPosts] = useState<SocialVideoAnalysisRecord[]>([])
  const [pendingPostsLoading, setPendingPostsLoading] = useState(true)
  const [pendingPostsError, setPendingPostsError] = useState('')
  const [batchStatus, setBatchStatus] = useState('')
  const [isBatchExtracting, setIsBatchExtracting] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setPendingPostsLoading(true)
      try {
        const rows = await listSocialVideoAnalyses()
        if (cancelled) return
        setPendingPosts(rows)
        setPendingPostsError('')
      } catch (error) {
        if (cancelled) return
        setPendingPosts([])
        setPendingPostsError(error instanceof Error ? error.message : '加载帖子失败')
      } finally {
        if (!cancelled) setPendingPostsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredPosts = useMemo(
    () => pendingPosts.filter((post) => post.work_type === workTypeFilter),
    [pendingPosts, workTypeFilter],
  )

  useEffect(() => {
    setJobs((prev) =>
      prev.map((job) => {
        if (!job.relatedPostId) return job
        const stillValid = filteredPosts.some((post) => post.id === job.relatedPostId)
        return stillValid ? job : { ...job, relatedPostId: '' }
      }),
    )
  }, [filteredPosts])

  function updateJob(id: string, patch: Partial<ExtractJob>) {
    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, ...patch } : job)))
  }

  function availablePostsFor(jobId: string) {
    const selectedElsewhere = new Set(
      jobs.filter((job) => job.id !== jobId && job.relatedPostId).map((job) => job.relatedPostId),
    )
    return filteredPosts.filter((post) => !selectedElsewhere.has(post.id))
  }

  async function runBatchExtract() {
    if (isBatchExtracting) return

    const targets = jobs.filter((job) => job.videoFile)
    if (targets.length === 0) {
      setBatchStatus('请先为至少一组配置上传视频。')
      return
    }
    if (!prompt.trim()) {
      setBatchStatus('请先填写提取要求。')
      return
    }

    setIsBatchExtracting(true)
    setSaveStatus('')
    setBatchStatus(`正在按并发 ${BATCH_CONCURRENCY} 批量提取 ${targets.length} 组...`)

    for (const job of targets) {
      updateJob(job.id, {
        isLoading: true,
        status: '排队中...',
        resultText: '',
        resultData: null,
        resultExpanded: false,
      })
    }

    let successCount = 0
    let failCount = 0

    await mapPool(targets, BATCH_CONCURRENCY, async (job) => {
      updateJob(job.id, { status: '正在抽取视频帧...' })
      try {
        const { raw, parsed, requestId } = await requestExtract(job.videoFile!, prompt)
        successCount += 1
        updateJob(job.id, {
          resultText: raw,
          resultData: parsed,
          status: `提取完成${requestId ? ` · ${requestId}` : ''}`,
          isLoading: false,
          resultExpanded: false,
        })
      } catch (error) {
        failCount += 1
        const message = error instanceof Error ? error.message : '未知错误'
        updateJob(job.id, {
          resultText: '',
          resultData: null,
          status: isLikelyNetworkOrCorsError(message)
            ? '调用失败：无法连接提取服务，请缩短视频后重试。'
            : `调用失败：${message}`,
          isLoading: false,
          resultExpanded: false,
        })
      }
    })

    setIsBatchExtracting(false)
    setBatchStatus(`批量提取结束：成功 ${successCount}，失败 ${failCount}`)
  }

  const runBatchExtractRef = useRef(runBatchExtract)
  runBatchExtractRef.current = runBatchExtract

  useEffect(() => {
    onBatchExtractReady?.({
      run: () => {
        void runBatchExtractRef.current()
      },
      busy: isBatchExtracting,
    })
    return () => onBatchExtractReady?.(null)
  }, [isBatchExtracting, onBatchExtractReady])

  async function saveRecords() {
    const ready = jobs.filter((job) => job.relatedPostId && job.resultData != null)
    if (ready.length === 0) {
      setSaveStatus('请先完成至少一组「关联帖子 + 提取结果」。')
      return
    }

    setIsSaving(true)
    setSaveStatus(`正在保存 ${ready.length} 组...`)

    try {
      const savedIds: string[] = []
      for (const job of ready) {
        const existing =
          pendingPosts.find((post) => post.id === job.relatedPostId) ||
          (await getSocialVideoAnalysis(job.relatedPostId))
        const publishDate = readPublishDate(job.resultData)

        await updateSocialVideoAnalysis(job.relatedPostId, {
          title: existing.title || '',
          publishedAt: publishDate || existing.published_at || '',
          coverUrl: existing.cover_url,
          markdown: JSON.stringify(job.resultData),
          outline: existing.outline || '',
          imagePreviews: existing.image_previews || [],
          publishStatus: existing.publish_status,
          workType: existing.work_type,
        })
        savedIds.push(job.relatedPostId)
      }

      setJobs((prev) =>
        prev.map((job) =>
          savedIds.includes(job.relatedPostId)
            ? {
                ...job,
                relatedPostId: '',
                videoFile: null,
                resultText: '',
                resultData: null,
                status: '已保存',
                resultExpanded: false,
              }
            : job,
        ),
      )
      setSaveStatus(`保存成功：已更新 ${savedIds.length} 篇帖子`)
      onSaved?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败'
      setSaveStatus(`保存失败：${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const fieldClass =
    'rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-300'
  const fieldStyle = {
    borderColor: 'var(--era-border)',
    background: 'var(--era-input)',
    color: 'var(--era-fg)',
  } as const
  const panelStyle = {
    borderColor: 'var(--era-border)',
    background: 'var(--era-panel)',
  } as const

  return (
    <div
      className={`${embedded ? 'min-h-0 flex-1' : 'h-dvh'} overflow-y-auto`}
      style={{
        background: 'var(--era-bg)',
        color: 'var(--era-fg)',
        paddingTop: embedded ? undefined : 'env(safe-area-inset-top, 0px)',
      }}
    >
      <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        {!embedded ? (
          <div className="flex items-center justify-end gap-3">
            <button
              className="inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                borderColor: 'var(--era-border)',
                background: 'var(--era-button)',
                color: 'var(--era-button-fg)',
              }}
              type="button"
              disabled={isBatchExtracting}
              onClick={() => void runBatchExtract()}
            >
              {isBatchExtracting ? '提取中...' : '批量提取'}
            </button>
            <a
              className="inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition hover:opacity-90"
              style={{ borderColor: 'var(--era-border)' }}
              href="/era/"
            >
              返回 Era
            </a>
          </div>
        ) : null}

        <label className="flex flex-col gap-2 rounded-3xl border p-4" style={panelStyle}>
          <span className="text-sm font-medium">提取要求</span>
          <textarea
            className={`${fieldClass} min-h-48 resize-y font-mono leading-6`}
            style={fieldStyle}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="flex min-w-[12rem] flex-col gap-2">
            <span className="text-sm font-medium">帖子类型</span>
            <select
              className={fieldClass}
              style={fieldStyle}
              value={workTypeFilter}
              onChange={(event) => setWorkTypeFilter(event.target.value as SocialVideoWorkType)}
            >
              {EXTRACT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="inline-flex h-11 items-center gap-1.5 rounded-2xl border px-4 text-sm font-semibold transition hover:opacity-90"
            style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
            onClick={() => setJobs((prev) => [...prev, createJob()])}
          >
            <Plus size={16} />
            添加一组
          </button>
        </div>

        {pendingPostsError ? (
          <p className="text-sm" style={{ color: 'var(--era-muted)' }}>
            {pendingPostsError}
          </p>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job, index) => {
            const posts = availablePostsFor(job.id)
            const preview = formatResultPreview(job.resultData, job.resultText)
            const hasResult = Boolean(preview)

            return (
              <div key={job.id} className="flex flex-col gap-3 rounded-3xl border p-4" style={panelStyle}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">配置 {index + 1}</h3>
                  {jobs.length > 1 ? (
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-full transition hover:opacity-80"
                      style={{ background: 'var(--era-input)' }}
                      aria-label={`删除配置 ${index + 1}`}
                      disabled={isBatchExtracting || job.isLoading}
                      onClick={() => setJobs((prev) => prev.filter((item) => item.id !== job.id))}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">关联帖子</span>
                  <select
                    className={fieldClass}
                    style={fieldStyle}
                    value={job.relatedPostId}
                    disabled={pendingPostsLoading || isBatchExtracting}
                    onChange={(event) => updateJob(job.id, { relatedPostId: event.target.value })}
                  >
                    <option value="">
                      {pendingPostsLoading
                        ? '加载中...'
                        : posts.length === 0
                          ? `暂无${workTypeFilter}帖子`
                          : '请选择帖子'}
                    </option>
                    {posts.map((post) => (
                      <option key={post.id} value={post.id}>
                        {relatedPostLabel(post)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">上传视频</span>
                  <input
                    className={`${fieldClass} border-dashed file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-neutral-950`}
                    style={fieldStyle}
                    accept="video/*"
                    type="file"
                    disabled={isBatchExtracting}
                    onChange={(event) =>
                      updateJob(job.id, { videoFile: event.target.files?.[0] || null })
                    }
                  />
                  {job.videoFile ? (
                    <span className="truncate text-xs" style={{ color: 'var(--era-muted)' }}>
                      {job.videoFile.name}
                    </span>
                  ) : null}
                </label>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">提取结果</span>
                    {hasResult ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:opacity-90"
                        style={{ borderColor: 'var(--era-border)' }}
                        onClick={() =>
                          updateJob(job.id, { resultExpanded: !job.resultExpanded })
                        }
                      >
                        {job.resultExpanded ? (
                          <>
                            收起 <ChevronUp size={12} />
                          </>
                        ) : (
                          <>
                            展开 <ChevronDown size={12} />
                          </>
                        )}
                      </button>
                    ) : null}
                  </div>

                  {job.resultExpanded && hasResult ? (
                    <pre
                      className="overflow-y-auto rounded-2xl border p-3 font-mono text-xs leading-5 whitespace-pre-wrap break-words"
                      style={{
                        ...fieldStyle,
                        maxHeight: 100,
                      }}
                    >
                      {preview}
                    </pre>
                  ) : (
                    <p className="text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
                      {hasResult
                        ? '结果已就绪（默认折叠）'
                        : job.isLoading
                          ? job.status || '提取中...'
                          : '等待提取'}
                    </p>
                  )}

                  {job.status ? (
                    <p className="text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
                      {job.status}
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </section>

        {batchStatus ? (
          <p className="text-sm leading-6" style={{ color: 'var(--era-muted)' }}>
            {batchStatus}
          </p>
        ) : null}

        <div className="sticky bottom-0 z-10 -mx-4 border-t px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" style={{ background: 'var(--era-bg)', borderColor: 'var(--era-border)' }}>
          <button
            className="h-12 w-full rounded-2xl text-sm font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--era-button)', color: 'var(--era-button-fg)' }}
            type="button"
            disabled={isSaving || isBatchExtracting}
            onClick={() => void saveRecords()}
          >
            {isSaving ? '保存中...' : '保存（替换对应帖子提取内容）'}
          </button>
          {saveStatus ? (
            <p
              className="mt-3 rounded-2xl px-3 py-2 text-sm font-medium"
              style={{
                color: saveStatus.startsWith('保存成功') ? 'var(--era-success)' : 'var(--era-muted)',
                background: 'var(--era-input)',
              }}
            >
              {saveStatus}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  )
}
