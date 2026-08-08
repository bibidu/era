import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { PreviewImageItem } from './downloadImagesAsZip'
import {
  preparePreviewImagesForShare,
  sharePreparedImagesToPhotos,
} from './downloadImagesAsZip'
import { describePhotosShareBlocker, isPhotosShareAvailable } from './photosShareEnv'

interface FullscreenImageViewerProps {
  images: PreviewImageItem[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  /** 是否显示下载到相册按钮（仅 Web Share，无其它兜底） */
  enableDownload?: boolean
}

export function FullscreenImageViewer({
  images,
  index,
  onIndexChange,
  onClose,
  enableDownload = true,
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
  const preparedRef = useRef<(File | null)[]>([])
  const [preparedReady, setPreparedReady] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState('')

  const imagesKey = images.map((image) => image.src).join('\n')

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

  useEffect(() => {
    if (!enableDownload) return
    let cancelled = false
    setPreparedReady(false)
    preparedRef.current = images.map(() => null)
    void (async () => {
      const result = await preparePreviewImagesForShare(images)
      if (cancelled) return
      preparedRef.current = result.filesByIndex
      setPreparedReady(result.files.length > 0)
    })()
    return () => {
      cancelled = true
    }
  }, [enableDownload, imagesKey])

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

  async function handleDownload() {
    if (!isPhotosShareAvailable()) {
      setDownloadStatus(describePhotosShareBlocker())
      return
    }
    const file = preparedRef.current[safeIndex]
    if (!file) {
      setDownloadStatus(preparedReady ? '当前图片准备失败' : '图片准备中，请稍后再点')
      return
    }
    try {
      await sharePreparedImagesToPhotos([file])
      setDownloadStatus('请选择「存储到照片」')
      window.setTimeout(() => setDownloadStatus(''), 2200)
    } catch (error) {
      setDownloadStatus(error instanceof Error ? error.message : '保存失败')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: 'rgb(0 0 0 / 0.94)', color: '#ffffff' }}
      role="dialog"
      aria-modal="true"
      aria-label="图片全屏预览"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          aria-label="返回"
          onClick={onClose}
        >
          <ChevronLeft size={20} />
        </button>
        <span className="min-w-10 text-center text-sm font-medium tabular-nums">
          {safeIndex + 1} / {total}
        </span>
        {enableDownload ? (
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-40"
            aria-label="保存到相册"
            disabled={!preparedReady}
            onClick={() => void handleDownload()}
          >
            <Download size={18} />
          </button>
        ) : (
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="关闭"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        )}
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

      <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {downloadStatus ? (
          <p
            className="mb-2 text-center text-xs"
            style={{ color: 'rgb(255 255 255 / 0.65)' }}
          >
            {downloadStatus}
          </p>
        ) : null}
        <div className="mx-auto flex max-w-sm items-center justify-center gap-3">
          <button
            type="button"
            className="flex h-11 min-w-[5.25rem] flex-1 items-center justify-center gap-1 rounded-full bg-white/10 px-3 text-sm font-medium transition hover:bg-white/20 disabled:opacity-35"
            aria-label="上一张"
            disabled={safeIndex <= 0}
            onClick={() => onIndexChange(safeIndex - 1)}
          >
            <ChevronLeft size={18} />
            左边
          </button>
          <button
            type="button"
            className="flex h-11 min-w-[5.25rem] flex-1 items-center justify-center gap-1 rounded-full bg-white/10 px-3 text-sm font-medium transition hover:bg-white/20 disabled:opacity-35"
            aria-label="下一张"
            disabled={safeIndex >= total - 1}
            onClick={() => onIndexChange(safeIndex + 1)}
          >
            右边
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="flex h-11 min-w-[5.25rem] flex-1 items-center justify-center gap-1 rounded-full bg-white/15 px-3 text-sm font-medium transition hover:bg-white/25"
            aria-label="关闭"
            onClick={onClose}
          >
            <X size={18} />
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
