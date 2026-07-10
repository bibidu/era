import { useCallback, useRef } from 'react'
import { Settings2 } from 'lucide-react'
import type { TextElement } from '../types'
import { getTextContentStyle, getWrapperStyle } from '../utils/textLayout'

const LONG_PRESS_MS = 380
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/svg+xml,image/heic,image/heif'

function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

interface PosterCanvasProps {
  posterUrl: string | null
  texts: TextElement[]
  selectedId: string | null
  isExporting: boolean
  onSelectText: (id: string) => void
  onOpenConfig: (id: string) => void
  onUpdateTextPosition: (id: string, x: number, y: number) => void
  onUploadPoster: (file: File) => void
}

export function PosterCanvas({
  posterUrl,
  texts,
  selectedId,
  isExporting,
  onSelectText,
  onOpenConfig,
  onUpdateTextPosition,
  onUploadPoster,
}: PosterCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    id: string
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const pressRef = useRef<{
    id: string
    timer: ReturnType<typeof setTimeout>
    didLongPress: boolean
    moved: boolean
  } | null>(null)
  const pointerPosRef = useRef({ x: 0, y: 0 })
  const listenersRef = useRef<(() => void) | null>(null)

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current
      const container = canvasRef.current
      if (!drag || !container) return

      const rect = container.getBoundingClientRect()
      const dx = clientX - drag.startX
      const dy = clientY - drag.startY
      const x = Math.min(Math.max(drag.originX + dx, 0), rect.width - 24)
      const y = Math.min(Math.max(drag.originY + dy, 0), rect.height - 24)
      onUpdateTextPosition(drag.id, x, y)
    },
    [onUpdateTextPosition],
  )

  const cleanupDragListeners = useCallback(() => {
    listenersRef.current?.()
    listenersRef.current = null
    document.body.classList.remove('is-dragging')
  }, [])

  const endDrag = useCallback(() => {
    dragRef.current = null
    if (pressRef.current) {
      clearTimeout(pressRef.current.timer)
      pressRef.current = null
    }
    cleanupDragListeners()
  }, [cleanupDragListeners])

  const startDragListeners = useCallback(() => {
    cleanupDragListeners()
    document.body.classList.add('is-dragging')

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      e.preventDefault()
      if (pressRef.current) pressRef.current.moved = true
      handlePointerMove(e.clientX, e.clientY)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current) return
      e.preventDefault()
      const touch = e.touches[0]
      if (touch) handlePointerMove(touch.clientX, touch.clientY)
    }

    const onPointerUp = () => {
      endDrag()
    }

    document.addEventListener('pointermove', onPointerMove, { passive: false })
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerUp)
    document.addEventListener('touchmove', onTouchMove, { passive: false })

    listenersRef.current = () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerUp)
      document.removeEventListener('touchmove', onTouchMove)
    }
  }, [cleanupDragListeners, endDrag, handlePointerMove])

  const beginDrag = useCallback(
    (text: TextElement, wrapper: HTMLElement) => {
      const container = canvasRef.current
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const wrapperRect = wrapper.getBoundingClientRect()

      dragRef.current = {
        id: text.id,
        startX: pointerPosRef.current.x,
        startY: pointerPosRef.current.y,
        originX: wrapperRect.left - containerRect.left,
        originY: wrapperRect.top - containerRect.top,
      }

      if (pressRef.current) pressRef.current.didLongPress = true
      startDragListeners()
      handlePointerMove(pointerPosRef.current.x, pointerPosRef.current.y)
    },
    [startDragListeners, handlePointerMove],
  )

  const handleIconPointerDown = useCallback(
    (text: TextElement, e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      onSelectText(text.id)

      pointerPosRef.current = { x: e.clientX, y: e.clientY }
      const wrapper = e.currentTarget.parentElement
      if (!wrapper) return

      const timer = setTimeout(() => {
        if (pressRef.current?.id !== text.id) return
        beginDrag(text, wrapper)
      }, LONG_PRESS_MS)

      pressRef.current = { id: text.id, timer, didLongPress: false, moved: false }

      const trackPointer = (ev: PointerEvent) => {
        pointerPosRef.current = { x: ev.clientX, y: ev.clientY }
        if (pressRef.current && !dragRef.current) {
          const dx = ev.clientX - e.clientX
          const dy = ev.clientY - e.clientY
          if (Math.hypot(dx, dy) > 8) pressRef.current.moved = true
        }
      }

      document.addEventListener('pointermove', trackPointer)
      const cleanupTrack = () => document.removeEventListener('pointermove', trackPointer)
      ;(pressRef.current as { cleanup?: () => void }).cleanup = cleanupTrack
    },
    [onSelectText, beginDrag],
  )

  const handleIconPointerUp = useCallback(
    (textId: string, e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const press = pressRef.current as (typeof pressRef.current & { cleanup?: () => void }) | null
      const wasDragging = !!dragRef.current

      press?.cleanup?.()

      if (press?.id === textId) {
        clearTimeout(press.timer)
        if (!press.didLongPress && !press.moved && !wasDragging) {
          onOpenConfig(textId)
        }
      }

      endDrag()
    },
    [onOpenConfig, endDrag],
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && isImageFile(file)) onUploadPoster(file)
    event.target.value = ''
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-3">
      <div
        ref={canvasRef}
        id="poster-canvas"
        className="poster-canvas relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-neutral-300 bg-neutral-100 shadow-sm"
        style={{ aspectRatio: '3 / 4', touchAction: 'none' }}
        onClick={() => onSelectText('')}
      >
        {posterUrl ? (
          <img
            src={posterUrl}
            alt="海报底图"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 text-neutral-400">
            <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={handleFileChange} />
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-neutral-400">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 16V4m0 0L8 8m4-4 4 4" />
                <path d="M4 20h16" />
              </svg>
            </div>
            <span className="text-sm">点击上传图片</span>
          </label>
        )}

        {texts.map((text) => {
          const isSelected = selectedId === text.id

          return (
            <div
              key={text.id}
              style={getWrapperStyle(text)}
              onClick={(e) => {
                e.stopPropagation()
                onSelectText(text.id)
              }}
            >
              <div
                className={`select-none px-0.5 ${
                  isSelected && !isExporting
                    ? 'border border-dashed border-black'
                    : 'border border-transparent'
                }`}
                style={getTextContentStyle(text)}
              >
                {text.content || '点击编辑'}
              </div>

              {isSelected && !isExporting && (
                <button
                  type="button"
                  aria-label="编辑素材，长按拖动"
                  className="material-drag-handle export-hide mx-auto mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-400 bg-white text-neutral-700 shadow-sm select-none"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => handleIconPointerDown(text, e)}
                  onPointerUp={(e) => handleIconPointerUp(text.id, e)}
                  onPointerCancel={(e) => handleIconPointerUp(text.id, e)}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Settings2 size={12} strokeWidth={1.5} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {posterUrl && (
        <label className="export-hide mt-3 shrink-0 cursor-pointer text-sm text-neutral-500 underline underline-offset-2">
          <input type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={handleFileChange} />
          更换图片
        </label>
      )}
    </div>
  )
}
