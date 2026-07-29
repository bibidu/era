import { useEffect, type CSSProperties, type ReactNode } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  dialogClassName?: string
  dialogStyle?: CSSProperties
}

/** 轻量底部弹层，替代 HeroUI Drawer，避免引入整包组件样式 */
export function BottomSheet({
  isOpen,
  onOpenChange,
  children,
  dialogClassName = '',
  dialogStyle,
}: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onOpenChange])

  if (!isOpen) return null

  return (
    <div className="era-bottom-sheet fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-black/50"
        aria-label="关闭"
        onClick={() => onOpenChange(false)}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
        <div
          role="dialog"
          aria-modal="true"
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
