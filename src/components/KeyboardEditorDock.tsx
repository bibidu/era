import { Check, Keyboard, Palette, Type } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { TextElement } from '../types'

type EditorTab = 'keyboard' | 'font' | 'style'

const TABS: { id: EditorTab; label: string; icon: typeof Keyboard }[] = [
  { id: 'keyboard', label: '键盘', icon: Keyboard },
  { id: 'font', label: '字体', icon: Type },
  { id: 'style', label: '样式', icon: Palette },
]

interface KeyboardEditorDockProps {
  text: TextElement
  onUpdate: (id: string, updates: Partial<TextElement>) => void
  onTabSelect: (tab: EditorTab) => void
  onCommit: () => void
}

export function KeyboardEditorDock({
  text,
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
      <div className="component-library-header flex shrink-0 items-center justify-between px-4 py-2">
        <h2 className="text-sm font-medium text-white">组件库</h2>
        <button type="button" aria-label="完成" className="component-done-btn" onClick={onCommit}>
          <Check size={15} strokeWidth={2} />
        </button>
      </div>

      <div className="flex shrink-0 border-b border-neutral-700 px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const selected = tab.id === 'keyboard'
          return (
            <button
              key={tab.id}
              type="button"
              className={`component-tab flex flex-1 flex-row items-center justify-center gap-1.5 py-2 ${
                selected ? 'component-tab--active' : 'text-neutral-400'
              }`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onTabSelect(tab.id)
              }}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span className="text-xs">{tab.label}</span>
            </button>
          )
        })}
      </div>

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
          className="keyboard-dock-textarea w-full resize-none rounded-xl border border-neutral-600 bg-[#2a2a2a] px-3 py-3 text-base text-white outline-none placeholder:text-neutral-500"
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
