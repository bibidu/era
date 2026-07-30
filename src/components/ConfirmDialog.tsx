import { useEffect } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirming?: boolean
  /** 危险操作时用红色确认按钮 */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** 轻量二次确认弹层 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  confirming = false,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirming) onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, confirming, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 border-0"
        style={{ background: 'rgb(0 0 0 / 0.55)' }}
        aria-label="关闭"
        disabled={confirming}
        onClick={() => {
          if (!confirming) onCancel()
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? 'confirm-dialog-desc' : undefined}
        className="relative w-full max-w-sm rounded-3xl border p-5 shadow-xl"
        style={{
          borderColor: 'var(--era-border)',
          background: 'var(--era-panel)',
          color: 'var(--era-fg)',
        }}
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold">
          {title}
        </h2>
        {description ? (
          <p
            id="confirm-dialog-desc"
            className="mt-2 text-sm leading-6"
            style={{ color: 'var(--era-muted)' }}
          >
            {description}
          </p>
        ) : null}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="h-11 flex-1 rounded-2xl text-sm font-medium transition hover:opacity-90 disabled:opacity-40"
            style={{
              background: 'var(--era-input)',
              color: 'var(--era-fg)',
              border: '1px solid var(--era-border)',
            }}
            disabled={confirming}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="h-11 flex-1 rounded-2xl text-sm font-bold transition hover:opacity-90 disabled:opacity-40"
            style={
              destructive
                ? { background: 'rgb(220 38 38)', color: '#ffffff' }
                : { background: 'var(--era-button)', color: 'var(--era-button-fg)' }
            }
            disabled={confirming}
            onClick={onConfirm}
          >
            {confirming ? '处理中...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
