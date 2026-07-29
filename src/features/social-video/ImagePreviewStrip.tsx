import { Download, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { downloadImagesAsZip, type PreviewImageItem } from './downloadImagesAsZip'

interface ImagePreviewStripProps {
  images: PreviewImageItem[]
  zipName?: string
}

export function ImagePreviewStrip({ images, zipName = 'preview-images.zip' }: ImagePreviewStripProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  async function handleDownloadZip() {
    if (downloading || images.length === 0) return
    setDownloading(true)
    setStatusMessage('正在打包下载...')
    try {
      await downloadImagesAsZip(images, zipName)
      setStatusMessage('已开始下载')
      window.setTimeout(() => setStatusMessage(''), 1800)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '下载失败')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">图片预览</span>
        {images.length > 0 ? (
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-full transition hover:opacity-80 disabled:opacity-40"
            style={{ color: 'var(--era-fg)' }}
            aria-label="下载预览图压缩包"
            disabled={downloading}
            onClick={() => void handleDownloadZip()}
          >
            <Download size={18} strokeWidth={2.25} />
          </button>
        ) : null}
      </div>

      {images.length === 0 ? (
        <p className="text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
          暂无图片（图片预览字段或内容中的 Markdown 图片会出现在这里）
        </p>
      ) : (
        <div className="flex w-full flex-nowrap gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={`${image.src}-${index}`}
              type="button"
              className="aspect-[3/4] h-32 w-auto min-w-[7.5rem] shrink-0 overflow-hidden rounded-2xl border transition hover:opacity-90"
              style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
              aria-label={`查看第 ${index + 1} 张预览图`}
              onClick={() => setViewerIndex(index)}
            >
              <img
                src={image.src}
                alt={image.alt || `预览图 ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}

      {statusMessage ? (
        <p className="text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
          {statusMessage}
        </p>
      ) : null}

      {viewerIndex !== null ? (
        <FullscreenImageViewer
          images={images}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </div>
  )
}

interface FullscreenImageViewerProps {
  images: PreviewImageItem[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

function FullscreenImageViewer({
  images,
  index,
  onIndexChange,
  onClose,
}: FullscreenImageViewerProps) {
  const total = images.length
  const safeIndex = Math.min(Math.max(index, 0), Math.max(total - 1, 0))
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 375,
  )
  const [dragOffset, setDragOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return
    const sync = () => setViewportWidth(node.clientWidth || window.innerWidth)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'ArrowLeft' && safeIndex > 0) {
        onIndexChange(safeIndex - 1)
        return
      }
      if (event.key === 'ArrowRight' && safeIndex < total - 1) {
        onIndexChange(safeIndex + 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, onIndexChange, safeIndex, total])

  const finishDrag = useCallback(
    (offset: number) => {
      const threshold = Math.min(80, viewportWidth * 0.18)
      if (offset > threshold && safeIndex > 0) {
        onIndexChange(safeIndex - 1)
      } else if (offset < -threshold && safeIndex < total - 1) {
        onIndexChange(safeIndex + 1)
      }
      setDragOffset(0)
      setDragging(false)
      pointerIdRef.current = null
    },
    [onIndexChange, safeIndex, total, viewportWidth],
  )

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerIdRef.current = event.pointerId
    startXRef.current = event.clientX
    setDragging(true)
    setDragOffset(0)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId || !dragging) return
    let next = event.clientX - startXRef.current
    if ((safeIndex === 0 && next > 0) || (safeIndex === total - 1 && next < 0)) {
      next *= 0.35
    }
    setDragOffset(next)
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    finishDrag(event.clientX - startXRef.current)
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return
    setDragOffset(0)
    setDragging(false)
    pointerIdRef.current = null
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: 'rgb(0 0 0 / 0.94)', color: '#ffffff' }}
      role="dialog"
      aria-modal="true"
      aria-label="图片全屏预览"
    >
      <div className="flex shrink-0 items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <span className="min-w-10 text-sm font-medium tabular-nums">
          {safeIndex + 1} / {total}
        </span>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          aria-label="关闭全屏预览"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          className="flex h-full will-change-transform"
          style={{
            width: viewportWidth * total,
            transform: `translate3d(${-safeIndex * viewportWidth + dragOffset}px, 0, 0)`,
            transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {images.map((image, imageIndex) => (
            <div
              key={`${image.src}-${imageIndex}`}
              className="flex h-full shrink-0 items-center justify-center px-3"
              style={{ width: viewportWidth }}
            >
              <img
                src={image.src}
                alt={image.alt || `预览图 ${imageIndex + 1}`}
                className="max-h-full max-w-full select-none object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className="shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-center text-xs"
        style={{ color: 'rgb(255 255 255 / 0.65)' }}
      >
        左右滑动切换图片
      </div>
    </div>
  )
}
