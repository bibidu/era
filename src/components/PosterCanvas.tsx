import { useCallback, useRef } from 'react'
import { Settings2 } from 'lucide-react'
import type { TextElement } from '../types'
import { getTextContentStyle, getWrapperStyle } from '../utils/textLayout'

const LONG_PRESS_MS = 450

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

  const endDrag = useCallback(() => {
    dragRef.current = null
    if (pressRef.current) {
      clearTimeout(pressRef.current.timer)
      pressRef.current = null
    }
  }, [])

  const handleIconPointerDown = useCallback(
    (text: TextElement, e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      onSelectText(text.id)

      const container = canvasRef.current
      const wrapper = e.currentTarget.parentElement
      if (!container || !wrapper) return

      const containerRect = container.getBoundingClientRect()
      const wrapperRect = wrapper.getBoundingClientRect()
      const originX = wrapperRect.left - containerRect.left
      const originY = wrapperRect.top - containerRect.top

      const timer = setTimeout(() => {
        if (pressRef.current?.id !== text.id) return
        pressRef.current.didLongPress = true
        dragRef.current = {
          id: text.id,
          startX: e.clientX,
          startY: e.clientY,
          originX,
          originY,
        }
        e.currentTarget.setPointerCapture(e.pointerId)
      }, LONG_PRESS_MS)

      pressRef.current = { id: text.id, timer, didLongPress: false, moved: false }
    },
    [onSelectText],
  )

  const handleIconPointerUp = useCallback(
    (textId: string, e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      const press = pressRef.current

      if (press?.id === textId) {
        clearTimeout(press.timer)
        if (!press.didLongPress && !press.moved && !dragRef.current) {
          onOpenConfig(textId)
        }
      }

      endDrag()
    },
    [onOpenConfig, endDrag],
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onUploadPoster(file)
    event.target.value = ''
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-3">
      <div
        ref={canvasRef}
        id="poster-canvas"
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-neutral-300 bg-neutral-100 shadow-sm"
        style={{ aspectRatio: '3 / 4' }}
        onPointerMove={(e) => {
          if (pressRef.current && dragRef.current) {
            pressRef.current.moved = true
          }
          if (dragRef.current) handlePointerMove(e.clientX, e.clientY)
        }}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClick={() => onSelectText('')}
      >
        {posterUrl ? (
          <img
            src={posterUrl}
            alt="海报底图"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 text-neutral-400">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-neutral-400">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 16V4m0 0L8 8m4-4 4 4" />
                <path d="M4 20h16" />
              </svg>
            </div>
            <span className="text-sm">点击上传海报</span>
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
                  className="export-hide mx-auto mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-400 bg-white text-neutral-700 shadow-sm active:bg-neutral-100"
                  onPointerDown={(e) => handleIconPointerDown(text, e)}
                  onPointerUp={(e) => handleIconPointerUp(text.id, e)}
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
        <label className="export-hide mt-3 cursor-pointer text-sm text-neutral-500 underline underline-offset-2">
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          更换海报
        </label>
      )}
    </div>
  )
}
