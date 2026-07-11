import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

interface BottomTextInputProps {
  value: string
  placeholder?: string
  onChange: (value: string) => void
  onOpenChange?: (open: boolean) => void
}

export function BottomTextInput({
  value,
  placeholder = '输入文字内容',
  onChange,
  onOpenChange,
}: BottomTextInputProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) setDraft(value)
  }, [value, open])

  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  const setOpenState = (next: boolean) => {
    setOpen(next)
    document.body.classList.toggle('text-input-open', next)
  }

  useEffect(() => {
    return () => document.body.classList.remove('text-input-open')
  }, [])

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

  const focusInput = () => {
    const el = inputRef.current
    if (!el) return
    el.focus({ preventScroll: true })
    const end = el.value.length
    el.setSelectionRange(end, end)
  }

  const openInput = () => {
    setDraft(value)
    flushSync(() => setOpenState(true))
    focusInput()
  }

  const commit = () => {
    onChange(draft)
    setOpenState(false)
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault()
          openInput()
        }}
        className="min-h-[44px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-left text-sm text-black"
      >
        {value ? (
          <span className="line-clamp-3 whitespace-pre-wrap">{value}</span>
        ) : (
          <span className="text-neutral-400">{placeholder}</span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/20 pointer-events-auto"
            onPointerDown={(e) => {
              e.preventDefault()
              commit()
            }}
            aria-hidden
          />
          <div
            ref={panelRef}
            className="pointer-events-auto fixed inset-x-0 bottom-0 z-[70] border-t border-neutral-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.12)]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              rows={3}
              autoFocus
              inputMode="text"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="on"
              spellCheck
              className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base text-black outline-none"
              style={{ fontSize: '16px', WebkitUserSelect: 'text', userSelect: 'text', touchAction: 'manipulation' }}
              onPointerDown={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              className="mt-2 w-full rounded-lg bg-black py-2.5 text-sm text-white"
              onClick={commit}
            >
              完成输入
            </button>
          </div>
        </>
      )}
    </>
  )
}
