import { useMemo, useState } from 'react'

const SUPABASE_PROXY_ENDPOINT =
  'https://kzoxyextxjwscrpjowud.functions.supabase.co/dashscope-video-extract'

const DEFAULT_MODEL = 'qwen3.7-flash'
const DEFAULT_FPS = '1'
const MAX_FRAME_COUNT = 24
const FRAME_MAX_WIDTH = 640

const NETWORK_ERROR_MARKERS = ['failed to fetch', 'networkerror', 'load failed', 'type error']

const DEFAULT_PROMPT = `请从这个社媒视频中提取尽可能完整的数据，并严格用 Markdown 返回。

需要包含：
1. 基础信息：时长、画幅、语言/地区、平台风格、视频类型。
2. 一句话总结：这个视频讲了什么。
3. 时间轴分镜：按时间顺序列出画面、人物/物体、动作、字幕/屏幕文字、旁白/音频、关键信息。
4. 文案结构：开头钩子、铺垫、主体卖点/知识点、转折、结尾 CTA。
5. 可复用素材：标题、封面文案、口播稿、评论区引导、标签/关键词。
6. 视觉与声音：镜头、构图、剪辑节奏、BGM/音效、情绪。
7. 商业/账号信息：品牌、产品、价格、优惠、账号定位、受众画像；无法判断请写“未识别”。
8. 数据化总结：用表格汇总所有可观察事实，不要编造看不见的信息。`

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

function waitForVideoEvent(
  video: HTMLVideoElement,
  eventName: 'loadedmetadata' | 'loadeddata' | 'seeked',
) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
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

    video.addEventListener(eventName, handleEvent, { once: true })
    video.addEventListener('error', handleError, { once: true })
  })
}

async function waitForVideoFrame(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return
  }

  await waitForVideoEvent(video, 'loadeddata')
}

async function seekVideo(video: HTMLVideoElement, time: number) {
  const targetTime = Math.min(Math.max(time, 0), Math.max(video.duration - 0.05, 0))

  if (Math.abs(video.currentTime - targetTime) < 0.01) {
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
  video.preload = 'metadata'
  video.src = objectUrl

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

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isLikelyNetworkOrCorsError(message: string) {
  const normalized = message.toLowerCase()
  return NETWORK_ERROR_MARKERS.some((marker) => normalized.includes(marker))
}

export function SocialVideoDataPage() {
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [fps, setFps] = useState(DEFAULT_FPS)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [markdown, setMarkdown] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const canSubmit = useMemo(() => {
    return model.trim() && prompt.trim() && (videoFile || videoUrl.trim())
  }, [model, prompt, videoFile, videoUrl])

  const videoSizeHint = useMemo(() => {
    if (!videoFile) {
      return ''
    }
    const size = formatBytes(videoFile.size)
    return `${size}；本地上传会先抽取最多 ${MAX_FRAME_COUNT} 帧，避免完整视频触发代理资源限制。`
  }, [videoFile])

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

  async function submit() {
    if (!canSubmit) {
      setStatus('请先填写模型、提示词，并上传视频或填写视频 URL。')
      return
    }

    setIsLoading(true)
    setMarkdown('')
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

      const response = await fetch(SUPABASE_PROXY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        throw new Error(message)
      }

      setMarkdown(data.markdown || JSON.stringify(data, null, 2))
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

  return (
    <div className="h-dvh overflow-y-auto bg-neutral-950 text-neutral-100">
      <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
                Social Video Extractor
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                社媒视频完整数据提取
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300">
                上传本地视频或填写公网视频 URL，通过 Supabase 服务端代理调用 Qwen
                多模态模型，结果以 Markdown 显示并可一键复制。
              </p>
            </div>
            <a
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-medium text-neutral-200 transition hover:bg-white/10"
              href="/era/"
            >
              返回 Era
            </a>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50">
              DashScope API Key 已托管在 Supabase Edge Function 环境变量中，前端不会展示或传输密钥。
              本地上传会先在浏览器端按 FPS 抽帧，最多 {MAX_FRAME_COUNT} 帧；如需包含音频或完整视频时序，请填写公网视频 URL。
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-neutral-200">模型</span>
                <input
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-neutral-200">FPS</span>
                <input
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
                  min="0.2"
                  step="0.1"
                  type="number"
                  value={fps}
                  onChange={(event) => setFps(event.target.value)}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-200">上传视频</span>
              <input
                className="rounded-2xl border border-dashed border-white/15 bg-black/30 px-4 py-3 text-sm text-neutral-300 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-neutral-950"
                accept="video/*"
                type="file"
                onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
              />
              {videoSizeHint ? <span className="text-xs leading-5 text-amber-200">{videoSizeHint}</span> : null}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-200">或填写公网视频 URL</span>
              <input
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-300"
                type="url"
                value={videoUrl}
                placeholder="https://example.com/video.mp4"
                onChange={(event) => setVideoUrl(event.target.value)}
              />
            </label>

            <label className="flex flex-1 flex-col gap-2">
              <span className="text-sm font-medium text-neutral-200">提取要求</span>
              <textarea
                className="min-h-64 flex-1 resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm leading-6 text-white outline-none transition focus:border-cyan-300"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </label>

            <button
              className="h-12 rounded-2xl bg-white text-sm font-bold text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              disabled={!canSubmit || isLoading}
              onClick={submit}
            >
              {isLoading ? '提取中...' : '开始提取完整数据'}
            </button>

            {status ? <p className="text-sm leading-6 text-neutral-300">{status}</p> : null}
          </div>

          <div className="flex min-h-[32rem] flex-col rounded-3xl border border-white/10 bg-white/[0.06] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Markdown 结果</h2>
                <p className="text-xs text-neutral-500">模型返回后会显示在这里。</p>
              </div>
              <button
                className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                disabled={!markdown}
                onClick={copyMarkdown}
              >
                一键复制
              </button>
            </div>

            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-sm leading-6 text-neutral-100">
              {markdown || '等待提取结果...'}
            </pre>
          </div>
        </section>
      </main>
    </div>
  )
}
