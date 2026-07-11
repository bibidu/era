import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface BottomTextInputProps {
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

export function BottomTextInput({
  value,
  placeholder = '输入文字内容',
  onChange,
}: BottomTextInputProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) setDraft(value)
  }, [value, open])

  const openInput = () => {
    setDraft(value)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const timer = requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    return () => cancelAnimationFrame(timer)
  }, [open])

  const commit = () => {
    onChange(draft)
    setOpen(false)
  }

  const overlay = open
    ? createPortal(
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/20"
            onClick={commit}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-[210] border-t border-neutral-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base text-black outline-none"
              style={{ fontSize: '16px' }}
            />
            <button
              type="button"
              className="mt-2 w-full rounded-lg bg-black py-2.5 text-sm text-white"
              onClick={commit}
            >
              完成输入
            </button>
          </div>
        </>,
        document.body,
      )
    : null

  return (
    <>
      <button
        type="button"
        onClick={openInput}
        className="min-h-[44px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-left text-sm text-black"
      >
        {value ? (
          <span className="line-clamp-3 whitespace-pre-wrap">{value}</span>
        ) : (
          <span className="text-neutral-400">{placeholder}</span>
        )}
      </button>
      {overlay}
    </>
  )
}
