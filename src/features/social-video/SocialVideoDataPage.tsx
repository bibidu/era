import { useMemo, useState } from 'react'

const SUPABASE_PROXY_ENDPOINT =
  'https://kzoxyextxjwscrpjowud.functions.supabase.co/dashscope-video-extract'

const DEFAULT_MODEL = 'qwen3.7-flash'

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

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('视频读取失败，请重新选择文件。'))
      }
    }
    reader.onerror = () => reject(new Error('视频读取失败，请重新选择文件。'))
    reader.readAsDataURL(file)
  })
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
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [fps, setFps] = useState('2')
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [markdown, setMarkdown] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const canSubmit = useMemo(() => {
    return apiKey.trim() && model.trim() && prompt.trim() && (videoFile || videoUrl.trim())
  }, [apiKey, model, prompt, videoFile, videoUrl])

  const videoSizeHint = useMemo(() => {
    if (!videoFile) {
      return ''
    }
    const size = formatBytes(videoFile.size)
    if (videoFile.size > 7 * 1024 * 1024) {
      return `${size}；Base64 会放大请求体，较大文件建议改用公网视频 URL。`
    }
    return size
  }, [videoFile])

  async function pasteApiKey() {
    try {
      const text = await navigator.clipboard.readText()
      setApiKey(text.trim())
      setStatus('已从剪贴板填入 API Key。')
    } catch {
      setStatus('读取剪贴板失败，请确认浏览器授权后重试。')
    }
  }

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
      setStatus('请先填写 API Key、模型、提示词，并上传视频或填写视频 URL。')
      return
    }

    setIsLoading(true)
    setMarkdown('')
    setStatus(videoFile ? '正在读取本地视频并调用模型...' : '正在调用模型...')

    try {
      const videoSource = videoFile ? await fileToDataUrl(videoFile) : videoUrl.trim()
      const parsedFps = Number.parseFloat(fps)
      const response = await fetch(SUPABASE_PROXY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          model: model.trim(),
          video: videoSource,
          fps: Number.isFinite(parsedFps) && parsedFps > 0 ? parsedFps : 2,
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
                上传本地视频或填写公网视频 URL，使用你自己的 DashScope API Key 调用
                Qwen 多模态模型，结果以 Markdown 显示并可一键复制。
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
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-200">DashScope API Key</span>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-300"
                  type="password"
                  value={apiKey}
                  placeholder="sk-..."
                  autoComplete="off"
                  onChange={(event) => setApiKey(event.target.value)}
                />
                <button
                  className="shrink-0 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200"
                  type="button"
                  onClick={pasteApiKey}
                >
                  粘贴
                </button>
              </div>
              <span className="text-xs leading-5 text-neutral-500">
                API Key 只会随本次请求发给 Supabase 代理函数，不会写入仓库或部署产物。
              </span>
            </label>

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
