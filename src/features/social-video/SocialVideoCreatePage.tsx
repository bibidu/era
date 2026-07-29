import { ChevronLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_SOCIAL_VIDEO_WORK_TYPE,
  SOCIAL_VIDEO_PUBLISH_STATUSES,
  SOCIAL_VIDEO_WORK_TYPES,
  createSocialVideoAnalysis,
  getSocialVideoAnalysis,
  updateSocialVideoAnalysis,
  type SocialVideoAnalysisRecord,
  type SocialVideoPublishStatus,
  type SocialVideoWorkType,
} from '../../agent/supabaseSocialVideoAnalysis'
import { MarkdownContentDrawer } from './MarkdownContentDrawer'
import { extractMarkdownImages, truncateText } from './parseMarkdownMetrics'

interface SocialVideoCreatePageProps {
  onBack: () => void
  onCreated?: () => void
  /** 传入则为编辑模式 */
  editingRecord?: SocialVideoAnalysisRecord | null
}

const fieldClass =
  'w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-300'
const fieldStyle = {
  borderColor: 'var(--era-border)',
  background: 'var(--era-input)',
  color: 'var(--era-fg)',
} as const

function buildAiRevisionPrompt(outline: string, content: string, workType: SocialVideoWorkType) {
  const outlineText = outline.trim()
  const contentText = content.trim()
  const coverClause = workType === '图文' ? '封面图以及' : ''
  return `你需要按照大纲: ${outlineText}或内容:${contentText}，并使用 图文skill进行生成任务。

首先，你需要生成5个标题以及正文内容(如果提供了正文，则严格按照正文进行展示)，并引导用户选择或确定一个标题。

然后，当标题和内容都确认后，你需要生成 ${coverClause}内容图，并经由阿里云对象存储上传，并把多个图片链接依次写入 supabase 的 图片预览字段中，除了该字段，确定的标题和内容也需要保存到supabase的这一条记录中。`
}

export function SocialVideoCreatePage({
  onBack,
  onCreated,
  editingRecord = null,
}: SocialVideoCreatePageProps) {
  const isEdit = Boolean(editingRecord?.id)
  const [publishStatus, setPublishStatus] = useState<SocialVideoPublishStatus>('待AI修改')
  const [outline, setOutline] = useState('')
  const [workType, setWorkType] = useState<SocialVideoWorkType>(DEFAULT_SOCIAL_VIDEO_WORK_TYPE)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [publishedAt, setPublishedAt] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [contentDrawerOpen, setContentDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [statusMessage, setStatusMessage] = useState('')
  const [copyHint, setCopyHint] = useState('')

  useEffect(() => {
    if (!editingRecord?.id) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const full =
          editingRecord.markdown !== undefined && editingRecord.outline !== undefined
            ? editingRecord
            : await getSocialVideoAnalysis(editingRecord.id)
        if (cancelled) return
        setPublishStatus(full.publish_status)
        setOutline(full.outline || '')
        setWorkType(full.work_type)
        setTitle(full.title || '')
        setContent(full.markdown || '')
        setPublishedAt(full.published_at || '')
        setCoverUrl(full.cover_url)
        setImagePreviews(full.image_previews || [])
        setStatusMessage('')
        setCopyHint('')
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(error instanceof Error ? error.message : '加载帖子失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [editingRecord])

  const canSubmit = useMemo(() => outline.trim().length > 0 && Boolean(workType), [outline, workType])

  const previewImages = useMemo(() => {
    if (!isEdit) return []
    if (imagePreviews.length > 0) {
      return imagePreviews.map((src, index) => ({
        src,
        alt: index === 0 ? '封面' : `预览图 ${index + 1}`,
      }))
    }
    return extractMarkdownImages(content, coverUrl)
  }, [isEdit, imagePreviews, content, coverUrl])

  async function handleCopyPrompt() {
    const prompt = buildAiRevisionPrompt(outline, content, workType)
    try {
      await navigator.clipboard.writeText(prompt)
      setCopyHint('已复制')
      window.setTimeout(() => setCopyHint(''), 1600)
    } catch {
      setCopyHint('复制失败')
      window.setTimeout(() => setCopyHint(''), 2000)
    }
  }

  async function handleSubmit() {
    if (!canSubmit || saving || loading) return
    setSaving(true)
    setStatusMessage(isEdit ? '正在保存...' : '正在创建...')
    try {
      const payload = {
        title: title.trim(),
        publishedAt,
        coverUrl,
        markdown: content,
        outline: outline.trim(),
        imagePreviews,
        publishStatus,
        workType,
      }
      if (isEdit && editingRecord?.id) {
        await updateSocialVideoAnalysis(editingRecord.id, payload)
        setStatusMessage('保存成功')
      } else {
        await createSocialVideoAnalysis(payload)
        setStatusMessage('创建成功')
      }
      onCreated?.()
      onBack()
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? `${isEdit ? '保存' : '创建'}失败：${error.message}`
          : `${isEdit ? '保存' : '创建'}失败`,
      )
    } finally {
      setSaving(false)
    }
  }

  const contentPreview = content.trim()
    ? truncateText(content.replace(/\s+/g, ' '), 36)
    : '点击编辑 Markdown 内容'

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}>
      <header
        className="flex shrink-0 items-center gap-2 border-b px-3 py-3"
        style={{ borderColor: 'var(--era-border)' }}
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
        <h1 className="min-w-0 flex-1 text-base font-semibold">{isEdit ? '编辑帖子' : '创建帖子'}</h1>
        {isEdit ? (
          <button
            type="button"
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition hover:opacity-90"
            style={{
              background: 'var(--era-panel)',
              color: 'var(--era-fg)',
              border: '1px solid var(--era-border)',
            }}
            disabled={loading}
            onClick={() => void handleCopyPrompt()}
          >
            {copyHint || '复制提示词'}
          </button>
        ) : null}
      </header>

      <div
        className="sticky top-0 z-10 flex shrink-0 gap-2 overflow-x-auto border-b px-4 py-2.5"
        style={{ borderColor: 'var(--era-border)', background: 'var(--era-bg)' }}
      >
        {SOCIAL_VIDEO_PUBLISH_STATUSES.map((status) => {
          const active = publishStatus === status
          return (
            <button
              key={status}
              type="button"
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition"
              style={
                active
                  ? { background: 'var(--era-button)', color: 'var(--era-button-fg)' }
                  : {
                      background: 'var(--era-panel)',
                      color: 'var(--era-muted)',
                      border: '1px solid var(--era-border)',
                    }
              }
              onClick={() => setPublishStatus(status)}
            >
              {status}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm" style={{ color: 'var(--era-muted)' }}>
            加载中...
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                大纲<span className="ml-1 text-rose-400">*</span>
              </span>
              <textarea
                className={`${fieldClass} min-h-28 resize-y leading-6`}
                style={fieldStyle}
                value={outline}
                placeholder="填写必填大纲"
                onChange={(event) => setOutline(event.target.value)}
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                类型<span className="ml-1 text-rose-400">*</span>
              </span>
              <div className="flex gap-2">
                {SOCIAL_VIDEO_WORK_TYPES.map((type) => {
                  const active = workType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      className="rounded-full px-4 py-2 text-sm font-medium transition"
                      style={
                        active
                          ? { background: 'var(--era-button)', color: 'var(--era-button-fg)' }
                          : {
                              background: 'var(--era-panel)',
                              color: 'var(--era-muted)',
                              border: '1px solid var(--era-border)',
                            }
                      }
                      onClick={() => setWorkType(type)}
                    >
                      {type}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">标题</span>
              <input
                className={fieldClass}
                style={fieldStyle}
                value={title}
                placeholder="可选标题"
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            {isEdit ? (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">图片预览</span>
                {previewImages.length === 0 ? (
                  <p className="text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
                    暂无图片（图片预览字段或内容中的 Markdown 图片会出现在这里）
                  </p>
                ) : (
                  <div className="flex w-full flex-nowrap gap-3 overflow-x-auto pb-1">
                    {previewImages.map((image) => (
                      <div
                        key={image.src}
                        className="aspect-[3/4] h-32 w-auto min-w-[7.5rem] shrink-0 overflow-hidden rounded-2xl border"
                        style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
                      >
                        <img
                          src={image.src}
                          alt={image.alt || '预览图'}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">内容</span>
              <button
                type="button"
                className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition hover:opacity-90"
                style={fieldStyle}
                onClick={() => setContentDrawerOpen(true)}
              >
                <span
                  className="min-w-0 flex-1 truncate"
                  style={{ color: content.trim() ? 'var(--era-fg)' : 'var(--era-muted)' }}
                >
                  {contentPreview}
                </span>
                <span className="shrink-0 text-xs font-medium" style={{ color: 'var(--era-muted)' }}>
                  编辑
                </span>
              </button>
            </div>

            {statusMessage ? (
              <p className="text-sm" style={{ color: 'var(--era-muted)' }}>
                {statusMessage}
              </p>
            ) : null}
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
          className="h-12 w-full rounded-2xl text-sm font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--era-button)', color: 'var(--era-button-fg)' }}
          disabled={!canSubmit || saving || loading}
          onClick={() => void handleSubmit()}
        >
          {saving ? (isEdit ? '保存中...' : '创建中...') : isEdit ? '保存' : '创建'}
        </button>
      </div>

      <MarkdownContentDrawer
        isOpen={contentDrawerOpen}
        value={content}
        onClose={() => setContentDrawerOpen(false)}
        onSave={(next) => setContent(next)}
      />
    </div>
  )
}
