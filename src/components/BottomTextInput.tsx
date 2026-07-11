import { useEffect, useRef } from 'react'

interface TextInputTriggerProps {
  value: string
  placeholder?: string
  onOpen: () => void
}

export function TextInputTrigger({
  value,
  placeholder = '输入文字内容',
  onOpen,
}: TextInputTriggerProps) {
  return (
    <div
      role="button"
      tabIndex={-1}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      aria-label="文本内容"
      className="min-h-[44px] w-full cursor-text rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-left text-sm text-black outline-none"
      style={{ fontSize: '16px', touchAction: 'manipulation', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {value ? (
        <span className="line-clamp-3 whitespace-pre-wrap">{value}</span>
      ) : (
        <span className="text-neutral-400">{placeholder}</span>
      )}
    </div>
  )
}

interface TextInputOverlayProps {
  open: boolean
  draft: string
  placeholder?: string
  onDraftChange: (value: string) => void
  onCommit: () => void
}

export function TextInputOverlay({
  open,
  draft,
  placeholder = '输入文字内容',
  onDraftChange,
  onCommit,
}: TextInputOverlayProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const el = inputRef.current
    if (!el) return
    const timer = window.setTimeout(() => {
      el.focus({ preventScroll: true })
      const end = el.value.length
      el.setSelectionRange(end, end)
    }, 50)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return

    const viewport = window.visualViewport
    const updatePanelPosition = () => {
      const panel = panelRef.current
      if (!panel || !viewport) return
      const keyboardOffset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      panel.style.transform = keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : ''
    }

    updatePanelPosition()
    viewport?.addEventListener('resize', updatePanelPosition)
    viewport?.addEventListener('scroll', updatePanelPosition)
    return () => {
      viewport?.removeEventListener('resize', updatePanelPosition)
      viewport?.removeEventListener('scroll', updatePanelPosition)
    }
  }, [open])

  if (!open) return null

  const handleCommit = () => {
    inputRef.current?.blur()
    onCommit()
  }

  return (
    <>
      <div
        className="pointer-events-auto fixed inset-0 z-[60] bg-black/20"
        onClick={handleCommit}
        aria-hidden
      />
      <div
        ref={panelRef}
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-[70] border-t border-neutral-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.12)]"
      >
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          inputMode="text"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="on"
          spellCheck
          className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base text-black outline-none"
          style={{ fontSize: '16px', WebkitUserSelect: 'text', userSelect: 'text', touchAction: 'manipulation' }}
        />
        <button
          type="button"
          className="mt-2 w-full rounded-lg bg-black py-2.5 text-sm text-white"
          onTouchEnd={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleCommit()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleCommit()
          }}
        >
          完成输入
        </button>
      </div>
    </>
  )
}
