import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  dialogClassName?: string
  dialogStyle?: CSSProperties
}

const EXIT_MS = 320

/** 轻量底部弹层：可靠的滑入/滑出（强制 reflow 后再打开，避免首帧跳变） */
export function BottomSheet({
  isOpen,
  onOpenChange,
  children,
  dialogClassName = '',
  dialogStyle,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (isOpen) {
      setMounted(true)
      setVisible(false)
      let openTimer = 0
      const raf = window.requestAnimationFrame(() => {
        // 确保浏览器先提交「关闭态」样式，再切到打开态，动画才能播
        void panelRef.current?.offsetHeight
        openTimer = window.setTimeout(() => {
          void panelRef.current?.offsetHeight
          setVisible(true)
        }, 16)
      })
      return () => {
        window.cancelAnimationFrame(raf)
        window.clearTimeout(openTimer)
      }
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center overflow-hidden">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          data-open={visible ? 'true' : 'false'}
          className={`era-bottom-sheet__dialog pointer-events-auto flex w-full max-h-[85vh] flex-col overflow-hidden rounded-t-3xl ${dialogClassName}`}
          style={{
            background: 'var(--era-sheet)',
            color: 'var(--era-fg)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            ...dialogStyle,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
