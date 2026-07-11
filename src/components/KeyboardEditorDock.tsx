import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { TextElement } from '../types'
import { ComponentLibraryHeader, type EditorTab } from './ComponentLibraryHeader'

interface KeyboardEditorDockProps {
  text: TextElement
  activeTab: EditorTab
  onUpdate: (id: string, updates: Partial<TextElement>) => void
  onTabSelect: (tab: EditorTab) => void
  onCommit: () => void
}

export function KeyboardEditorDock({
  text,
  activeTab,
  onUpdate,
  onTabSelect,
  onCommit,
}: KeyboardEditorDockProps) {
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
  }, [text.id])

  return createPortal(
    <div ref={dockRef} className="keyboard-dock">
      <ComponentLibraryHeader
        activeTab={activeTab}
        onTabSelect={onTabSelect}
        onCommit={onCommit}
      />

      <div className="keyboard-dock-input px-4 py-3">
        <textarea
          ref={inputRef}
          value={text.content}
          onChange={(e) => onUpdate(text.id, { content: e.target.value })}
          placeholder="输入文字"
          rows={3}
          inputMode="text"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="on"
          spellCheck
          className="keyboard-dock-textarea w-full resize-none rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
          style={{
            fontSize: '16px',
            WebkitUserSelect: 'text',
            userSelect: 'text',
            fontFamily: text.fontFamily,
          }}
        />
      </div>
    </div>,
    document.body,
  )
}
