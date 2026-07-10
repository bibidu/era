import { useCallback, useRef } from 'react'
import type { TextElement } from '../types'
import { getTextStyle } from '../utils/textLayout'

interface PosterCanvasProps {
  posterUrl: string | null
  texts: TextElement[]
  selectedId: string | null
  isExporting: boolean
  onSelectText: (id: string) => void
  onUpdateTextPosition: (id: string, x: number, y: number) => void
  onUploadPoster: (file: File) => void
}

export function PosterCanvas({
  posterUrl,
  texts,
  selectedId,
  isExporting,
  onSelectText,
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

  const handlePointerDown = useCallback(
    (id: string, clientX: number, clientY: number, originX: number, originY: number, aligned: boolean) => {
      if (aligned) {
        onSelectText(id)
        return
      }
      dragRef.current = { id, startX: clientX, startY: clientY, originX, originY }
      onSelectText(id)
    },
    [onSelectText],
  )

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current
      const container = canvasRef.current
      if (!drag || !container) return

      const rect = container.getBoundingClientRect()
      const dx = clientX - drag.startX
      const dy = clientY - drag.startY
      const x = Math.min(Math.max(drag.originX + dx, 0), rect.width - 20)
      const y = Math.min(Math.max(drag.originY + dy, 0), rect.height - 20)
      onUpdateTextPosition(drag.id, x, y)
    },
    [onUpdateTextPosition],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

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
          if (dragRef.current) handlePointerMove(e.clientX, e.clientY)
        }}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
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
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
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
          const aligned = text.textAlign !== 'none'

          return (
            <div
              key={text.id}
              className="cursor-move select-none whitespace-pre-wrap px-1 leading-tight"
              style={getTextStyle(text, isSelected, isExporting)}
              onPointerDown={(e) => {
                e.stopPropagation()
                const target = e.currentTarget
                const container = canvasRef.current
                if (!container) return
                const containerRect = container.getBoundingClientRect()
                const targetRect = target.getBoundingClientRect()
                handlePointerDown(
                  text.id,
                  e.clientX,
                  e.clientY,
                  targetRect.left - containerRect.left,
                  targetRect.top - containerRect.top,
                  aligned,
                )
              }}
              onClick={(e) => {
                e.stopPropagation()
                onSelectText(text.id)
              }}
            >
              {text.content || '点击编辑'}
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
