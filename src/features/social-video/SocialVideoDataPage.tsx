import { useMemo, useState } from 'react'
import { browserSupabaseConfig } from '../../agent/supabaseHighlightSetup'
import { createSocialVideoAnalysis } from '../../agent/supabaseSocialVideoAnalysis'
import { extractMarkdownField } from './parseMarkdownFields'

const SUPABASE_PROXY_ENDPOINT =
  'https://kzoxyextxjwscrpjowud.functions.supabase.co/dashscope-video-extract'

const DEFAULT_MODEL = 'qwen3.7-flash'
const DEFAULT_FPS = '1'
const MAX_FRAME_COUNT = 24
const FRAME_MAX_WIDTH = 640
const VIDEO_EVENT_TIMEOUT_MS = 10000

const NETWORK_ERROR_MARKERS = ['failed to fetch', 'networkerror', 'load failed', 'type error']

const DEFAULT_PROMPT = `你只需要提取以下信息，并最终按照同样的格式补充数据，如果没有发现该数据则空着不填。

#总览
作品名称
作品话题/标签(以 # 开头）
发布日期
作品诊断？

#流量 
播放量
点赞量
评论量
分享量
收藏量
划走率
文案展开率
平均浏览图片数

#粉丝 
涨粉量
脱粉量
粉丝播放占比

#观众参与度 
点赞率
评论率
下载率
收藏率
分享率
不感兴趣率

#流量来源
推荐页
个人主页
朋友页
搜索
消息页
其他
平台扶持流量

#观众数据
吸粉量
吸粉率
脱粉量
脱粉率
不感兴趣量
不感兴趣率

#观众偏好
观众兴趣
观众喜欢/关注的同类作者(名称-粉丝量)
观众常搜的搜索词(名称)
观众喜欢的话题(名称)

#观众画像
观众特征总结
观众性别-男性占比(百分比)
观众年龄最多分布(年龄区间)
观众职业占比(职业及百分比)`

interface SocialVideoProxyResponse {
  markdown?: string
  error?: string
  requestId?: string | null
}

interface MediaInput {
  type: 'image' | 'video'
  url: string
  fps?: number
}

interface SocialVideoDataPageProps {
  embedded?: boolean
  onSaved?: () => void
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
      reject(new Error('视频解析失败，请换一个视频或使用公网视频 URL。'))
    }
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('视频抽帧超时，请换一个视频或使用公网视频 URL。'))
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
    const frameCount = Math.max(1, Math.min(MAX_FRAME_COUNT, Math.ceil(duration * fps)))
    const times =
      frameCount === 1
        ? [0]
        : Array.from({ length: frameCount }, (_, index) => (duration * index) / (frameCount - 1))

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('当前浏览器无法抽取视频帧。')
    }

    const frames: string[] = []

    for (const time of times) {
      await seekVideo(video, time)

      if (!video.videoWidth || !video.videoHeight) {
        throw new Error('无法读取视频画面尺寸。')
      }

      const scale = Math.min(1, FRAME_MAX_WIDTH / video.videoWidth)
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      frames.push(canvas.toDataURL('image/jpeg', 0.72))
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

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('封面读取失败。'))
      }
    }
    reader.onerror = () => reject(new Error('封面读取失败。'))
    reader.readAsDataURL(file)
  })
}

export function SocialVideoDataPage({ embedded = false, onSaved }: SocialVideoDataPageProps) {
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [fps, setFps] = useState(DEFAULT_FPS)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [markdown, setMarkdown] = useState('')
  const [workTitle, setWorkTitle] = useState('')
  const [publishDate, setPublishDate] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const canSubmit = useMemo(() => {
    return model.trim() && prompt.trim() && (videoFile || videoUrl.trim())
  }, [model, prompt, videoFile, videoUrl])

  async function copyMarkdown() {
    if (!markdown) {
      setStatus('暂无可复制内容。')
      return
    }

    try {
      await navigator.clipboard.writeText(markdown)
      setStatus('已复制 Markdown 结果。')
    } catch {
      setStatus('复制失败，请手动选中结果复制。')
    }
  }

  async function handleCoverChange(file: File | null) {
    if (!file) {
      setCoverUrl(null)
      return
    }

    try {
      setCoverUrl(await readImageFile(file))
    } catch (error) {
      const message = error instanceof Error ? error.message : '封面读取失败'
      setSaveStatus(message)
    }
  }

  async function saveRecord() {
    if (!markdown.trim()) {
      setSaveStatus('请先完成数据提取。')
      return
    }

    setIsSaving(true)
    setSaveStatus('正在保存...')

    try {
      await createSocialVideoAnalysis({
        title: workTitle.trim(),
        publishedAt: publishDate.trim(),
        coverUrl,
        markdown,
      })
      setSaveStatus('保存成功')
      onSaved?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败'
      setSaveStatus(`保存失败：${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  async function submit() {
    if (!canSubmit) {
      setStatus('请先填写模型、提示词，并上传视频或填写视频 URL。')
      return
    }

    setIsLoading(true)
    setMarkdown('')
    setWorkTitle('')
    setPublishDate('')
    setCoverUrl(null)
    setSaveStatus('')
    setStatus(videoFile ? '正在抽取本地视频帧...' : '正在调用模型...')

    try {
      const parsedFps = Number.parseFloat(fps)
      const normalizedFps = Number.isFinite(parsedFps) && parsedFps > 0 ? parsedFps : 1
      let media: MediaInput[]

      if (videoFile) {
        const frames = await extractVideoFrames(videoFile, normalizedFps)
        media = frames.map((url) => ({ type: 'image', url }))
        setStatus(`已抽取 ${frames.length} 帧，正在调用模型...`)
      } else {
        media = [{ type: 'video', url: videoUrl.trim(), fps: normalizedFps }]
      }

      const { anonKey } = browserSupabaseConfig()
      const response = await fetch(SUPABASE_PROXY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          model: model.trim(),
          media,
          fps: normalizedFps,
          prompt: prompt.trim(),
        }),
      })

      const text = await response.text()
      const data = text ? (JSON.parse(text) as SocialVideoProxyResponse) : {}

      if (!response.ok) {
        const message = data.error || text || `HTTP ${response.status}`
        if (response.status === 401) {
          throw new Error(
            '鉴权失败（401）：Supabase 代理或 DashScope API Key 无效。请检查 Supabase 函数密钥 DASHSCOPE_API_KEY，或刷新页面后重试。',
          )
        }
        throw new Error(message)
      }

      const nextMarkdown = data.markdown || JSON.stringify(data, null, 2)
      setMarkdown(nextMarkdown)
      setWorkTitle(extractMarkdownField(nextMarkdown, '作品名称'))
      setPublishDate(extractMarkdownField(nextMarkdown, '发布日期'))
      setStatus(`提取完成。Request ID：${data.requestId || '未返回'}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      setStatus(
        isLikelyNetworkOrCorsError(message)
          ? '调用失败：浏览器无法访问 Supabase 代理函数，通常是网络或代理部署状态问题。请稍后重试。'
          : `调用失败：${message}`,
      )
    } finally {
      setIsLoading(false)
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
      <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        {!embedded ? (
          <div className="flex justify-end">
            <a
              className="inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition hover:opacity-90"
              style={{ borderColor: 'var(--era-border)' }}
              href="/era/"
            >
              返回 Era
            </a>
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="flex flex-col gap-4 rounded-3xl border p-4" style={panelStyle}>
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">模型</span>
                <input
                  className={fieldClass}
                  style={fieldStyle}
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">FPS</span>
                <input
                  className={fieldClass}
                  style={fieldStyle}
                  min="0.2"
                  step="0.1"
                  type="number"
                  value={fps}
                  onChange={(event) => setFps(event.target.value)}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">上传视频</span>
              <input
                className={`${fieldClass} border-dashed file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-neutral-950`}
                style={fieldStyle}
                accept="video/*"
                type="file"
                onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">或填写公网视频 URL</span>
              <input
                className={fieldClass}
                style={fieldStyle}
                type="url"
                value={videoUrl}
                placeholder="https://example.com/video.mp4"
                onChange={(event) => setVideoUrl(event.target.value)}
              />
            </label>

            <label className="flex flex-1 flex-col gap-2">
              <span className="text-sm font-medium">提取要求</span>
              <textarea
                className={`${fieldClass} min-h-64 flex-1 resize-y font-mono leading-6`}
                style={fieldStyle}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </label>

            <button
              className="h-12 rounded-2xl text-sm font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'var(--era-button)', color: 'var(--era-button-fg)' }}
              type="button"
              disabled={!canSubmit || isLoading}
              onClick={submit}
            >
              {isLoading ? '提取中...' : '开始提取完整数据'}
            </button>

            {status ? (
              <p className="text-sm leading-6" style={{ color: 'var(--era-muted)' }}>
                {status}
              </p>
            ) : null}
          </div>

          <div className="flex min-h-[32rem] flex-col gap-4">
            <div className="flex min-h-[24rem] flex-1 flex-col rounded-3xl border p-4" style={panelStyle}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Markdown 结果</h2>
                <button
                  className="rounded-2xl border px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: 'var(--era-border)' }}
                  type="button"
                  disabled={!markdown}
                  onClick={copyMarkdown}
                >
                  一键复制
                </button>
              </div>

              <textarea
                className={`${fieldClass} min-h-0 flex-1 resize-y font-mono leading-6`}
                style={fieldStyle}
                value={markdown}
                placeholder="等待提取结果..."
                onChange={(event) => setMarkdown(event.target.value)}
              />
            </div>

            {markdown ? (
              <div className="rounded-3xl border p-4" style={panelStyle}>
                <h3 className="text-base font-semibold">保存作品</h3>
                <div className="mt-4 grid gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">作品名称</span>
                    <input
                      className={fieldClass}
                      style={fieldStyle}
                      value={workTitle}
                      onChange={(event) => setWorkTitle(event.target.value)}
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">发布日期</span>
                    <input
                      className={fieldClass}
                      style={fieldStyle}
                      value={publishDate}
                      onChange={(event) => setPublishDate(event.target.value)}
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">作品封面</span>
                    <input
                      className={`${fieldClass} border-dashed file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-neutral-950`}
                      style={fieldStyle}
                      accept="image/*"
                      type="file"
                      onChange={(event) => void handleCoverChange(event.target.files?.[0] || null)}
                    />
                  </label>

                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt="作品封面预览"
                      className="aspect-[3/4] w-28 rounded-2xl border object-cover"
                      style={{ borderColor: 'var(--era-border)' }}
                    />
                  ) : null}

                  <button
                    className="h-12 rounded-2xl text-sm font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: 'var(--era-button)', color: 'var(--era-button-fg)' }}
                    type="button"
                    disabled={isSaving}
                    onClick={saveRecord}
                  >
                    {isSaving ? '保存中...' : '保存到 Supabase'}
                  </button>

                  {saveStatus ? (
                    <p
                      className="rounded-2xl px-3 py-2 text-sm font-medium"
                      style={{
                        color: saveStatus === '保存成功' ? 'var(--era-success)' : 'var(--era-muted)',
                        background: 'var(--era-input)',
                      }}
                    >
                      {saveStatus}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}
