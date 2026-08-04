import { Download, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import type { PreviewImageItem } from './downloadImagesAsZip'
import {
  preparePreviewImagesForShare,
  sharePreparedImagesToPhotos,
} from './downloadImagesAsZip'
import { FullscreenImageViewer } from './FullscreenImageViewer'
import { describePhotosShareBlocker, isPhotosShareAvailable } from './photosShareEnv'

interface ImagePreviewStripProps {
  images: PreviewImageItem[]
  /** @deprecated 已忽略：不再打包 zip */
  zipName?: string
  /** 清空图片预览字段（仅本地状态，需用户点保存才持久化） */
  onClearImages?: () => void
}

export function ImagePreviewStrip({
  images,
  zipName: _zipName,
  onClearImages,
}: ImagePreviewStripProps) {
  void _zipName
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [preparedReady, setPreparedReady] = useState(false)
  const preparedRef = useRef<(File | null)[]>([])

  const imagesKey = images.map((image) => image.src).join('\n')

  useEffect(() => {
    let cancelled = false
    setPreparedReady(false)
    preparedRef.current = images.map(() => null)
    if (images.length === 0) return
    void (async () => {
      const result = await preparePreviewImagesForShare(images)
      if (cancelled) return
      preparedRef.current = result.filesByIndex
      setPreparedReady(result.files.length > 0)
    })()
    return () => {
      cancelled = true
    }
  }, [imagesKey])

  function handleConfirmClear() {
    onClearImages?.()
    setClearConfirmOpen(false)
    setViewerIndex(null)
    setStatusMessage('已清空预览图，保存后生效')
    window.setTimeout(() => setStatusMessage(''), 2600)
  }

  async function handleDownload() {
    if (!isPhotosShareAvailable()) {
      setStatusMessage(describePhotosShareBlocker())
      return
    }
    const files = preparedRef.current.filter((file): file is File => Boolean(file))
    if (files.length === 0) {
      setStatusMessage(preparedReady ? '图片准备失败' : '图片准备中，请稍后再点')
      return
    }
    try {
      await sharePreparedImagesToPhotos(files)
      setStatusMessage('请选择「存储到照片」')
      window.setTimeout(() => setStatusMessage(''), 2200)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '保存失败')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">图片预览</span>
        {images.length > 0 ? (
          <div className="flex items-center gap-1">
            {onClearImages ? (
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-full transition hover:opacity-80"
                style={{ color: 'var(--era-fg)' }}
                aria-label="清空所有预览图"
                onClick={() => setClearConfirmOpen(true)}
              >
                <Trash2 size={18} strokeWidth={2.25} />
              </button>
            ) : null}
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full transition hover:opacity-80 disabled:opacity-40"
              style={{ color: 'var(--era-fg)' }}
              aria-label="保存到相册"
              disabled={!preparedReady}
              onClick={() => void handleDownload()}
            >
              <Download size={18} strokeWidth={2.25} />
            </button>
          </div>
        ) : null}
      </div>

      {images.length === 0 ? (
        <p className="text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
          暂无图片（图片预览字段或内容中的 Markdown 图片会出现在这里）
        </p>
      ) : (
        <div className="grid w-full grid-cols-2 gap-3">
          {images.map((image, index) => (
            <button
              key={`${image.src}-${index}`}
              type="button"
              className="aspect-[9/16] w-full overflow-hidden rounded-2xl border transition hover:opacity-90"
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

      <ConfirmDialog
        open={clearConfirmOpen}
        title="确认删除所有预览图片？"
        description="将清空本帖的图片预览字段。点保存后才会写入数据库；内容中的 Markdown 图片不受影响。"
        confirmLabel="确认清空"
        cancelLabel="取消"
        destructive
        onCancel={() => setClearConfirmOpen(false)}
        onConfirm={handleConfirmClear}
      />
    </div>
  )
}
