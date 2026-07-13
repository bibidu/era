import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'

interface MarkdownEditorDockProps {
  value: string
  onChange: (value: string) => void
  onCommit: () => void
}

export function MarkdownEditorDock({ value, onChange, onCommit }: MarkdownEditorDockProps) {
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
    <div ref={dockRef} className="keyboard-dock">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
        <p className="text-sm font-medium text-neutral-900">编辑 Markdown</p>
        <button
          type="button"
          aria-label="完成编辑"
          className="component-done-btn"
          onClick={onCommit}
        >
          <Check size={15} />
        </button>
      </div>

      <div className="keyboard-dock-input px-4 py-3">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="# 输入标题&#10;&#10;正文可用 [[重点句子]] 或 **重点句子** 标记主题色"
          rows={6}
          inputMode="text"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="on"
          spellCheck
          className="keyboard-dock-textarea max-h-40 w-full resize-none rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-3 font-mono text-base leading-7 text-neutral-900 outline-none placeholder:text-neutral-400"
          style={{
            fontSize: '16px',
            WebkitUserSelect: 'text',
            userSelect: 'text',
          }}
        />
      </div>
    </div>,
    document.body,
  )
}
