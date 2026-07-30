import { ChevronLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_SOCIAL_VIDEO_PUBLISH_STATUS,
  DEFAULT_SOCIAL_VIDEO_WORK_TYPE,
  ERA_SOCIAL_VIDEO_ANALYSES_TABLE,
  SOCIAL_VIDEO_WORK_TYPES,
  createSocialVideoAnalysis,
  deleteSocialVideoAnalysis,
  getSocialVideoAnalysis,
  updateSocialVideoAnalysis,
  type SocialVideoAnalysisRecord,
  type SocialVideoWorkType,
} from '../../agent/supabaseSocialVideoAnalysis'
import { browserSupabaseConfig } from '../../agent/supabaseHighlightSetup'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { MarkdownContentDrawer } from './MarkdownContentDrawer'
import { ImagePreviewStrip } from './ImagePreviewStrip'
import { extractMarkdownImages, truncateText } from './parseMarkdownMetrics'

interface SocialVideoCreatePageProps {
  onBack: () => void
  onCreated?: () => void
  onDeleted?: () => void
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

function supabaseProjectRef(url: string): string {
  try {
    const host = new URL(url).hostname
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i)
    if (match) return match[1]
    return host
  } catch {
    return url
  }
}

interface AiRevisionPromptInput {
  recordId: string
  outline: string
  workType: SocialVideoWorkType
  title: string
  content: string
  imagePreviews: string[]
  publishStatus: string
}

function buildAiRevisionPrompt(input: AiRevisionPromptInput) {
  const { url } = browserSupabaseConfig()
  const projectRef = supabaseProjectRef(url)
  const coverClause = input.workType === '图文' ? '封面图以及' : ''

  const formBlocks: string[] = []
  const outline = input.outline.trim()
  if (outline) {
    formBlocks.push(`### 大纲\n${outline}`)
  }
  if (input.workType) {
    formBlocks.push(`### 类型\n${input.workType}`)
  }
  const title = input.title.trim()
  if (title) {
    formBlocks.push(`### 标题\n${title}`)
  }
  const content = input.content.trim()
  if (content) {
    formBlocks.push(`### 内容\n${content}`)
  }
  const previews = input.imagePreviews.map((src) => src.trim()).filter(Boolean)
  if (previews.length > 0) {
    formBlocks.push(
      `### 图片预览（image_previews，共 ${previews.length} 张）\n${previews
        .map((src, index) => `${index + 1}. ${src}`)
        .join('\n')}`,
    )
  }
  const publishStatus = input.publishStatus.trim()
  if (publishStatus) {
    formBlocks.push(`### 发布状态\n${publishStatus}`)
  }

  const formSection =
    formBlocks.length > 0
      ? formBlocks.join('\n\n')
      : '（当前表单无已填字段）'

  return `你需要使用 图文skill 进行生成任务。

## 目标记录（Supabase）
- 项目 ref：${projectRef}
- 项目 URL：${url}
- 表：${ERA_SOCIAL_VIDEO_ANALYSES_TABLE}
- 条目 id：${input.recordId}
- 需更新字段：title、markdown、image_previews（图片链接按序写入；封面须用 cover 文件名或 --cover，自动带 __cover_keep__ 永久标记）

## 任务说明
1. 生成 5 个标题候选以及正文（若下方已提供正文，则严格按照该正文展示），并引导用户选择或确认一个标题。
2. 标题与内容确认后，生成 ${coverClause}内容图，上传阿里云 OSS，再把图片链接依次写入上述条目的 image_previews；同时把确定的标题、内容写回同一条记录。

## 当前表单（仅含非空项）
${formSection}`
}

export function SocialVideoCreatePage({
  onBack,
  onCreated,
  onDeleted,
  editingRecord = null,
}: SocialVideoCreatePageProps) {
  const isEdit = Boolean(editingRecord?.id)
  const [outline, setOutline] = useState('')
  const [workType, setWorkType] = useState<SocialVideoWorkType>(DEFAULT_SOCIAL_VIDEO_WORK_TYPE)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [publishedAt, setPublishedAt] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  /** 用户在本页主动清空预览后，不再回退到 Markdown 内嵌图，避免「清空」无效感 */
  const [previewsExplicitlyCleared, setPreviewsExplicitlyCleared] = useState(false)
  const [contentDrawerOpen, setContentDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [statusMessage, setStatusMessage] = useState('')
  const [copyHint, setCopyHint] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
        setOutline(full.outline || '')
        setWorkType(full.work_type)
        setTitle(full.title || '')
        setContent(full.markdown || '')
        setPublishedAt(full.published_at || '')
        setCoverUrl(full.cover_url)
        setImagePreviews(full.image_previews || [])
        setPreviewsExplicitlyCleared(false)
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
    if (previewsExplicitlyCleared) return []
    return extractMarkdownImages(content, coverUrl)
  }, [isEdit, imagePreviews, content, coverUrl, previewsExplicitlyCleared])

  function handleClearPreviewImages() {
    setImagePreviews([])
    setPreviewsExplicitlyCleared(true)
  }

  async function handleCopyPrompt() {
    if (!editingRecord?.id) {
      setCopyHint('无条目 id')
      window.setTimeout(() => setCopyHint(''), 2000)
      return
    }
    const prompt = buildAiRevisionPrompt({
      recordId: editingRecord.id,
      outline,
      workType,
      title,
      content,
      imagePreviews,
      publishStatus: DEFAULT_SOCIAL_VIDEO_PUBLISH_STATUS,
    })
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
    if (!canSubmit || saving || loading || deleting) return
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
        publishStatus: DEFAULT_SOCIAL_VIDEO_PUBLISH_STATUS,
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

  async function handleDelete() {
    if (!isEdit || !editingRecord?.id || deleting || saving) return
    setDeleting(true)
    setStatusMessage('正在删除...')
    try {
      await deleteSocialVideoAnalysis(editingRecord.id)
      setConfirmOpen(false)
      onDeleted?.()
      onBack()
    } catch (error) {
      setStatusMessage(error instanceof Error ? `删除失败：${error.message}` : '删除失败')
      setDeleting(false)
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
        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
          style={{ background: 'var(--era-button)', color: 'var(--era-button-fg)' }}
        >
          {DEFAULT_SOCIAL_VIDEO_PUBLISH_STATUS}
        </span>
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
              <ImagePreviewStrip images={previewImages} onClearImages={handleClearPreviewImages} />
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
        <div className="flex gap-2">
          {isEdit ? (
            <button
              type="button"
              className="h-12 flex-1 rounded-2xl text-sm font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: 'rgb(220 38 38 / 0.14)',
                color: 'rgb(252 165 165)',
                border: '1px solid rgb(239 68 68 / 0.35)',
              }}
              disabled={saving || loading || deleting}
              onClick={() => setConfirmOpen(true)}
            >
              删除
            </button>
          ) : null}
          <button
            type="button"
            className="h-12 flex-1 rounded-2xl text-sm font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--era-button)', color: 'var(--era-button-fg)' }}
            disabled={!canSubmit || saving || loading || deleting}
            onClick={() => void handleSubmit()}
          >
            {saving ? (isEdit ? '保存中...' : '创建中...') : isEdit ? '保存' : '创建'}
          </button>
        </div>
      </div>

      <MarkdownContentDrawer
        isOpen={contentDrawerOpen}
        value={content}
        onClose={() => setContentDrawerOpen(false)}
        onSave={(next) => setContent(next)}
      />

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
