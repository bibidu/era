import { Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { downloadImagesAsZip, type PreviewImageItem } from './downloadImagesAsZip'

interface PreviewDownloadSheetProps {
  isOpen: boolean
  images: PreviewImageItem[]
  zipName?: string
  onOpenChange: (open: boolean) => void
  onStatus?: (message: string) => void
}

export function PreviewDownloadSheet({
  isOpen,
  images,
  zipName = 'preview-images.zip',
  onOpenChange,
  onStatus,
}: PreviewDownloadSheetProps) {
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(() => new Set())
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setSelectedIndexes(new Set(images.map((_, index) => index)))
    setDownloading(false)
    setProgress('')
  }, [isOpen, images])

  const allSelected = images.length > 0 && selectedIndexes.size === images.length
  const hasSelection = selectedIndexes.size > 0

  function toggleIndex(index: number) {
    setSelectedIndexes((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIndexes(new Set())
      return
    }
    setSelectedIndexes(new Set(images.map((_, index) => index)))
  }

  async function handleDownload() {
    if (!hasSelection || downloading) return
    const ordered = [...selectedIndexes].sort((a, b) => a - b)
    const selected = ordered.map((index) => images[index]).filter(Boolean)
    if (selected.length === 0) return

    setDownloading(true)
    setProgress('正在准备下载...')
    onStatus?.('正在准备下载...')
    try {
      const result = await downloadImagesAsZip(selected, zipName)
      const message =
        result.mode === 'ios-share'
          ? '请在分享菜单选择「存储到照片」'
          : '已开始下载压缩包'
      setProgress(message)
      onStatus?.(message)
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : '下载失败'
      setProgress(message)
      onStatus?.(message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <div className="size-9" aria-hidden />
        <p className="text-base font-semibold">选择图片下载</p>
        <button
          type="button"
          aria-label="关闭"
          className="flex size-9 items-center justify-center rounded-full transition hover:opacity-80"
          style={{ background: 'var(--era-panel)', color: 'var(--era-fg)' }}
          onClick={() => onOpenChange(false)}
        >
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto px-4 pb-4">
        <div className="flex items-start gap-3">
          {images.map((image, index) => {
            const selected = selectedIndexes.has(index)
            return (
              <button
                key={`${image.src}-${index}`}
                type="button"
                aria-label={`第 ${index + 1} 张预览图`}
                aria-pressed={selected}
                className="relative aspect-[3/4] h-44 w-auto min-w-[6.5rem] shrink-0 overflow-hidden rounded-2xl border transition"
                style={{
                  borderColor: selected ? 'var(--era-fg)' : 'var(--era-border)',
                  background: 'var(--era-panel)',
                }}
                onClick={() => toggleIndex(index)}
              >
                <img
                  src={image.src}
                  alt={image.alt || `预览图 ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <span
                  className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: '#ffffff',
                    background: selected ? 'var(--era-fg)' : 'rgb(0 0 0 / 0.28)',
                    color: 'var(--era-bg)',
                  }}
                  aria-hidden
                >
                  {selected ? <Check size={14} strokeWidth={2.5} /> : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="flex shrink-0 items-center justify-between gap-4 border-t px-4 py-3"
        style={{
          borderColor: 'var(--era-border)',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: 'var(--era-fg)' }}
          onClick={toggleAll}
        >
          <span
            className="flex size-5 items-center justify-center rounded-full border-2"
            style={{
              borderColor: allSelected ? 'var(--era-fg)' : 'var(--era-border)',
              background: allSelected ? 'var(--era-fg)' : 'transparent',
              color: 'var(--era-bg)',
            }}
            aria-hidden
          >
            {allSelected ? <Check size={12} strokeWidth={2.5} /> : null}
          </span>
          全部
        </button>

        <button
          type="button"
          disabled={!hasSelection || downloading}
          className="h-11 min-w-[7.5rem] rounded-full px-8 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--era-button)', color: 'var(--era-button-fg)' }}
          onClick={() => void handleDownload()}
        >
          {downloading ? progress || '下载中...' : `下载${hasSelection ? ` ${selectedIndexes.size}` : ''}`}
        </button>
      </div>
    </BottomSheet>
  )
}
