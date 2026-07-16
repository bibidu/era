import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Check, ClipboardPaste } from 'lucide-react'

interface MarkdownEditorDockProps {
  value: string
  onChange: (value: string) => void
  onPaste: () => void
  pasteError?: string
  onCommit: () => void
  onDismiss: () => void
  title?: string
}

export function MarkdownEditorDock({
  value,
  onChange,
  onPaste,
  pasteError,
  onCommit,
  onDismiss,
  title = '编辑 Markdown',
}: MarkdownEditorDockProps) {
  const dockRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    document.body.classList.add('keyboard-dock-open')
    return () => document.body.classList.remove('keyboard-dock-open')
  }, [])

  useEffect(() => {
    const dock = dockRef.current
    const viewport = window.visualViewport
    if (!dock || !viewport) return

    const pinAboveKeyboard = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      dock.style.transform = offset > 0 ? `translate3d(0, -${offset}px, 0)` : 'translate3d(0, 0, 0)'
    }

    pinAboveKeyboard()
    viewport.addEventListener('resize', pinAboveKeyboard)
    viewport.addEventListener('scroll', pinAboveKeyboard)

    const onFocus = () => {
      window.setTimeout(pinAboveKeyboard, 50)
      window.setTimeout(pinAboveKeyboard, 150)
      window.setTimeout(pinAboveKeyboard, 300)
    }

    const input = inputRef.current
    input?.addEventListener('focus', onFocus)

    return () => {
      viewport.removeEventListener('resize', pinAboveKeyboard)
      viewport.removeEventListener('scroll', pinAboveKeyboard)
      input?.removeEventListener('focus', onFocus)
      if (dock) dock.style.transform = ''
    }
  }, [])

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const focusInput = () => {
      input.focus({ preventScroll: true })
      const end = input.value.length
      input.setSelectionRange(end, end)
    }

    const t1 = window.setTimeout(focusInput, 80)
    const t2 = window.setTimeout(focusInput, 280)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])

  return createPortal(
    <div className="keyboard-dock-root">
      <button
        type="button"
        aria-label="关闭编辑"
        className="keyboard-dock-overlay"
        onClick={onDismiss}
      />
      <div ref={dockRef} className="keyboard-dock keyboard-dock--markdown">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <button
          type="button"
          aria-label="完成编辑"
          className="component-done-btn"
          onClick={onCommit}
        >
          <Check size={15} />
        </button>
      </div>

      <div className="keyboard-dock-input flex min-h-0 flex-1 px-4 py-3">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="# 输入标题&#10;&#10;正文可用 [[重点句子]] 或 **重点句子** 标记主题色"
          inputMode="text"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="on"
          spellCheck
          className="keyboard-dock-textarea min-h-0 w-full flex-1 resize-none rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-3 font-mono text-base leading-7 text-neutral-900 outline-none placeholder:text-neutral-400"
          style={{
            fontSize: '16px',
            WebkitUserSelect: 'text',
            userSelect: 'text',
          }}
        />
      </div>

      <div className="shrink-0 border-t border-neutral-200 px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
        {pasteError && (
          <p className="mb-2 text-center text-xs text-red-500">{pasteError}</p>
        )}
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white text-sm font-medium active:bg-neutral-100"
          onClick={onPaste}
        >
          <ClipboardPaste size={18} />
          粘贴
        </button>
      </div>
      </div>
    </div>,
    document.body,
  )
}
