import { ChevronLeft } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  DEFAULT_SOCIAL_VIDEO_WORK_TYPE,
  SOCIAL_VIDEO_PUBLISH_STATUSES,
  SOCIAL_VIDEO_WORK_TYPES,
  createSocialVideoAnalysis,
  type SocialVideoPublishStatus,
  type SocialVideoWorkType,
} from '../../agent/supabaseSocialVideoAnalysis'
import { MarkdownContentDrawer } from './MarkdownContentDrawer'
import { truncateText } from './parseMarkdownMetrics'

interface SocialVideoCreatePageProps {
  onBack: () => void
  onCreated?: () => void
}

const fieldClass =
  'w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-cyan-300'
const fieldStyle = {
  borderColor: 'var(--era-border)',
  background: 'var(--era-input)',
  color: 'var(--era-fg)',
} as const

export function SocialVideoCreatePage({ onBack, onCreated }: SocialVideoCreatePageProps) {
  const [publishStatus, setPublishStatus] = useState<SocialVideoPublishStatus>('待AI修改')
  const [outline, setOutline] = useState('')
  const [workType, setWorkType] = useState<SocialVideoWorkType>(DEFAULT_SOCIAL_VIDEO_WORK_TYPE)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contentDrawerOpen, setContentDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const canSubmit = useMemo(() => outline.trim().length > 0 && Boolean(workType), [outline, workType])

  async function handleCreate() {
    if (!canSubmit || saving) return
    setSaving(true)
    setStatusMessage('正在创建...')
    try {
      await createSocialVideoAnalysis({
        title: title.trim(),
        publishedAt: '',
        coverUrl: null,
        markdown: content,
        outline: outline.trim(),
        publishStatus,
        workType,
      })
      setStatusMessage('创建成功')
      onCreated?.()
      onBack()
    } catch (error) {
      setStatusMessage(error instanceof Error ? `创建失败：${error.message}` : '创建失败')
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
        <h1 className="text-base font-semibold">创建帖子</h1>
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

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">内容</span>
            <button
              type="button"
              className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition hover:opacity-90"
              style={fieldStyle}
              onClick={() => setContentDrawerOpen(true)}
            >
              <span className="min-w-0 flex-1 truncate" style={{ color: content.trim() ? 'var(--era-fg)' : 'var(--era-muted)' }}>
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
          disabled={!canSubmit || saving}
          onClick={() => void handleCreate()}
        >
          {saving ? '创建中...' : '创建'}
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
