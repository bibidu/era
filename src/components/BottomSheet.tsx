import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  dialogClassName?: string
  dialogStyle?: CSSProperties
}

const ENTER_MS = 280
const EXIT_MS = 220

/** 轻量底部弹层：backdrop + 面板滑入/滑出，关闭时等动画结束再卸载 */
export function BottomSheet({
  isOpen,
  onOpenChange,
  children,
  dialogClassName = '',
  dialogStyle,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      const raf = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true))
      })
      return () => window.cancelAnimationFrame(raf)
    }

    setVisible(false)
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    if (!mounted) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mounted, onOpenChange])

  if (!mounted) return null

  return (
    <div className="era-bottom-sheet fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        className="era-bottom-sheet__backdrop absolute inset-0 border-0"
        aria-label="关闭"
        data-open={visible ? 'true' : 'false'}
        onClick={() => onOpenChange(false)}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
        <div
          role="dialog"
          aria-modal="true"
          data-open={visible ? 'true' : 'false'}
          className={`era-bottom-sheet__dialog pointer-events-auto flex w-full max-h-[85vh] flex-col overflow-hidden rounded-t-3xl ${dialogClassName}`}
          style={{
            background: 'var(--era-sheet)',
            color: 'var(--era-fg)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            transitionDuration: `${visible ? ENTER_MS : EXIT_MS}ms`,
            ...dialogStyle,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
