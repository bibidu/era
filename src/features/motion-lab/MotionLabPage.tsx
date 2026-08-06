import { Check, ChevronLeft, Copy } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_MOTION_SCENE } from './defaultScene'
import { serializeMotionSetup, type MotionSceneConfig } from './types'

interface MotionLabPageProps {
  onBack: () => void
}

export function MotionLabPage({ onBack }: MotionLabPageProps) {
  const scene = DEFAULT_MOTION_SCENE
  const [description, setDescription] = useState(scene.description)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  useEffect(() => {
    setDescription(scene.description)
  }, [scene.description, scene.updatedAt])

  const draft: MotionSceneConfig = useMemo(
    () => ({
      ...scene,
      description,
    }),
    [scene, description],
  )

  const dirty = description.trim() !== scene.description.trim()

  const handleCopy = useCallback(async () => {
    setCopyError(null)
    const text = serializeMotionSetup(draft)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      } catch {
        setCopyError('复制失败，请长按文本手动复制')
      }
    }
  }, [draft])

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}
    >
      <header
        className="flex shrink-0 items-center gap-2 border-b px-3"
        style={{
          borderColor: 'var(--era-border)',
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '0.75rem',
          background: 'var(--era-header)',
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
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{scene.title}</h1>
          <p className="truncate text-xs" style={{ color: 'var(--era-muted)' }}>
            {scene.resolution} · {scene.durationSec}s · 运动预览
          </p>
        </div>
      </header>

      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
        style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: 'var(--era-border)', background: '#0b0f14' }}
        >
          <video
            key={scene.videoUrl + scene.updatedAt}
            className="aspect-video w-full bg-black object-contain"
            src={scene.videoUrl}
            controls
            playsInline
            loop
            muted
            autoPlay
            preload="auto"
          />
        </div>

        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className="text-sm font-medium">当前运动描述</p>
          {dirty ? (
            <span className="text-xs" style={{ color: '#F59E0B' }}>
              已修改，复制后发给 AI
            </span>
          ) : (
            <span className="text-xs" style={{ color: 'var(--era-muted)' }}>
              可直接改字
            </span>
          )}
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          spellCheck={false}
          className="min-h-[16rem] w-full flex-1 resize-y rounded-2xl border px-3 py-3 text-sm leading-relaxed outline-none"
          style={{
            borderColor: 'var(--era-border)',
            background: 'var(--era-panel)',
            color: 'var(--era-fg)',
          }}
          placeholder="描述镜头起点、路径、终点、速度、视差…"
        />

        {copyError ? (
          <p className="text-xs" style={{ color: '#F87171' }}>
            {copyError}
          </p>
        ) : null}

        <p className="text-xs leading-relaxed" style={{ color: 'var(--era-muted)' }}>
          改完点底部「一键复制」，粘贴发给我。我会按描述重做几秒 720p 预览，并更新本页描述。
        </p>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 border-t px-3 pt-3"
        style={{
          borderColor: 'var(--era-border)',
          background: 'var(--era-header)',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition hover:opacity-90"
          style={{
            background: copied ? '#059669' : 'var(--era-fg)',
            color: 'var(--era-bg)',
          }}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? '已复制，去对话粘贴' : '一键复制配置参数'}
        </button>
      </div>
    </div>
  )
}
