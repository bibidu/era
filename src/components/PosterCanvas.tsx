import { useEffect, useRef } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { TextElement } from '../types'
import { getTextContentStyle, getWrapperStyle } from '../utils/textLayout'

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
  onDeleteText: (id: string) => void
  onUploadPoster: (file: File) => void
  onCanvasResize?: (width: number, height: number) => void
}

export function PosterCanvas({
  posterUrl,
  texts,
  selectedId,
  isExporting,
  onSelectText,
  onOpenConfig,
  onDeleteText,
  onUploadPoster,
  onCanvasResize,
}: PosterCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = canvasRef.current
    if (!el || !onCanvasResize) return

    const report = () => onCanvasResize(el.clientWidth, el.clientHeight)
    report()

    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => ro.disconnect()
  }, [onCanvasResize, posterUrl])

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

        {[...texts]
          .sort((a, b) => {
            if (a.id === selectedId) return 1
            if (b.id === selectedId) return -1
            return 0
          })
          .map((text) => {
            const isSelected = selectedId === text.id

            return (
              <div
                key={text.id}
                className={isSelected ? 'z-20' : 'z-0'}
                style={getWrapperStyle(text)}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectText(text.id)
                }}
              >
                <div className="relative inline-block max-w-full">
                  <div
                    className="select-none border border-transparent px-0.5"
                    style={getTextContentStyle(text)}
                  >
                    {text.content ||
                      (!isExporting && (
                        <span style={{ opacity: 0.35, color: text.color }}>输入文字</span>
                      ))}
                  </div>

                  {isSelected && !isExporting && (
                    <div
                      className="pointer-events-none absolute -inset-px rounded-sm border border-dashed"
                      style={{ borderColor: text.color }}
                    />
                  )}

                  {isSelected && !isExporting && (
                    <>
                      <button
                        type="button"
                        aria-label="编辑素材"
                        className="export-hide absolute -right-2 -top-2 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenConfig(text.id)
                        }}
                      >
                        <Pencil size={12} strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        aria-label="删除素材"
                        className="export-hide absolute -bottom-2 -right-2 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white text-red-500 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteText(text.id)
                        }}
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </>
                  )}
                </div>
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
