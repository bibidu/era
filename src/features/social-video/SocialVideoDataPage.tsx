import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { legacyEdgeFunctionUrl } from '../../agent/legacyEdgeFunctionUrl'
import { LEGACY_SUPABASE_ANON_KEY } from '../../agent/supabaseHighlightSetup'
import {
  listSocialVideoAnalyses,
  type SocialVideoAnalysisRecord,
  type SocialVideoWorkType,
} from '../../agent/supabaseSocialVideoAnalysis'
import { truncateText } from './parseMarkdownMetrics'

const MAX_MEDIA_ITEMS = 12
const FRAME_MAX_WIDTH = 720
const FRAME_JPEG_QUALITY = 0.72
const EXTRACT_TYPE_OPTIONS: SocialVideoWorkType[] = ['图文', '风水']

interface ExtractJob {
  id: string
  relatedPostId: string
  imageFiles: File[]
}

interface SocialVideoDataPageProps {
  embedded?: boolean
  onTaskCreated?: () => void
  /** 供外层顶栏挂载「创建任务」按钮 */
  onCreateTaskReady?: (api: { run: () => void; busy: boolean } | null) => void
}

function createJob(): ExtractJob {
  return {
    id: crypto.randomUUID(),
    relatedPostId: '',
    imageFiles: [],
  }
}

function relatedPostLabel(record: SocialVideoAnalysisRecord) {
  const text = (record.title || '').trim() || (record.outline || '').trim() || '未命名帖子'
  return truncateText(text, 30)
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

export function SocialVideoDataPage({
  embedded = false,
  onTaskCreated,
  onCreateTaskReady,
}: SocialVideoDataPageProps) {
  const [workTypeFilter, setWorkTypeFilter] = useState<SocialVideoWorkType>('图文')
  const [jobs, setJobs] = useState<ExtractJob[]>(() => [createJob(), createJob(), createJob()])
  const [posts, setPosts] = useState<SocialVideoAnalysisRecord[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [status, setStatus] = useState('')
  const [successToast, setSuccessToast] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setPostsLoading(true)
      try {
        const rows = await listSocialVideoAnalyses()
        if (cancelled) return
        setPosts(rows)
        setPostsError('')
      } catch (error) {
        if (cancelled) return
        setPosts([])
        setPostsError(error instanceof Error ? error.message : '加载帖子失败')
      } finally {
        if (!cancelled) setPostsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredPosts = useMemo(
    () => posts.filter((post) => post.work_type === workTypeFilter),
    [posts, workTypeFilter],
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

  async function createTasks() {
    if (isCreating) return

    const targets = jobs.filter((job) => job.relatedPostId && job.imageFiles.length > 0)
    if (targets.length === 0) {
      setStatus('请先为至少一组选择关联帖子并上传图片。')
      return
    }

    setIsCreating(true)
    setStatus(`正在创建 ${targets.length} 个提取任务...`)

    try {
      const items = []
      for (const job of targets) {
        const images = []
        for (const file of job.imageFiles.slice(0, MAX_MEDIA_ITEMS)) {
          images.push(await compressImageFile(file))
        }
        items.push({ postId: job.relatedPostId, images })
      }

      const response = await fetch(legacyEdgeFunctionUrl('create-extract-task'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: LEGACY_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${LEGACY_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ items }),
      })
      const text = await response.text()
      let data: { ok?: boolean; error?: string; count?: number } = {}
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

      setStatus('')
      setSuccessToast(true)
      window.setTimeout(() => {
        setSuccessToast(false)
        onTaskCreated?.()
      }, 1000)
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建任务失败'
      setStatus(`创建失败：${message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const createTasksRef = useRef(createTasks)
  createTasksRef.current = createTasks

  useEffect(() => {
    onCreateTaskReady?.({
      run: () => {
        void createTasksRef.current()
      },
      busy: isCreating,
    })
    return () => onCreateTaskReady?.(null)
  }, [isCreating, onCreateTaskReady])

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
      className={`${embedded ? 'min-h-0 flex-1' : 'h-dvh'} relative overflow-y-auto`}
      style={{
        background: 'var(--era-bg)',
        color: 'var(--era-fg)',
        paddingTop: embedded ? undefined : 'env(safe-area-inset-top, 0px)',
      }}
    >
      {successToast ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-6">
          <div
            className="rounded-3xl border px-6 py-5 text-center text-base font-semibold shadow-lg"
            style={{ ...panelStyle, color: 'var(--era-fg)' }}
          >
            创建任务成功
          </div>
        </div>
      ) : null}

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
              disabled={isCreating}
              onClick={() => void createTasks()}
            >
              {isCreating ? '创建中...' : '创建任务'}
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="flex min-w-[12rem] flex-col gap-2">
            <span className="text-sm font-medium">帖子类型</span>
            <select
              className={fieldClass}
              style={fieldStyle}
              value={workTypeFilter}
              disabled={isCreating}
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
            disabled={isCreating}
            onClick={() => setJobs((prev) => [...prev, createJob()])}
          >
            <Plus size={16} />
            添加一组
          </button>
        </div>

        {postsError ? (
          <p className="text-sm" style={{ color: 'var(--era-muted)' }}>
            {postsError}
          </p>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job, index) => {
            const options = availablePostsFor(job.id)
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
                      disabled={isCreating}
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
                    disabled={postsLoading || isCreating}
                    onChange={(event) => updateJob(job.id, { relatedPostId: event.target.value })}
                  >
                    <option value="">
                      {postsLoading
                        ? '加载中...'
                        : options.length === 0
                          ? `暂无${workTypeFilter}帖子`
                          : '请选择帖子'}
                    </option>
                    {options.map((post) => (
                      <option key={post.id} value={post.id}>
                        {relatedPostLabel(post)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">上传图片（可多选）</span>
                  <input
                    className={`${fieldClass} border-dashed file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-neutral-950`}
                    style={fieldStyle}
                    accept="image/*"
                    type="file"
                    multiple
                    disabled={isCreating}
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []).filter((file) =>
                        file.type.startsWith('image/'),
                      )
                      updateJob(job.id, { imageFiles: files.slice(0, MAX_MEDIA_ITEMS) })
                    }}
                  />
                  {job.imageFiles.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: 'var(--era-muted)' }}>
                        已选 {job.imageFiles.length} 张
                      </span>
                      <ul
                        className="max-h-20 overflow-y-auto text-xs leading-5"
                        style={{ color: 'var(--era-muted)' }}
                      >
                        {job.imageFiles.map((file) => (
                          <li key={`${file.name}-${file.size}-${file.lastModified}`} className="truncate">
                            {file.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </label>
              </div>
            )
          })}
        </section>

        {status ? (
          <p className="text-sm leading-6" style={{ color: 'var(--era-muted)' }}>
            {status}
          </p>
        ) : null}
      </main>
    </div>
  )
}
