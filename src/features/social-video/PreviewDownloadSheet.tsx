import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import {
  preparePreviewImagesForShare,
  sharePreparedImagesToPhotos,
  type PreviewImageItem,
} from './downloadImagesAsZip'
import {
  describePhotosShareBlocker,
  getPhotosShareHttpsUpgradeUrl,
  isPhotosShareAvailable,
} from './photosShareEnv'

interface PreviewDownloadSheetProps {
  isOpen: boolean
  images: PreviewImageItem[]
  /** @deprecated 已忽略：不再打包 zip */
  zipName?: string
  onOpenChange: (open: boolean) => void
  onStatus?: (message: string) => void
}

export function PreviewDownloadSheet({
  isOpen,
  images,
  zipName: _zipName,
  onOpenChange,
  onStatus,
}: PreviewDownloadSheetProps) {
  void _zipName
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(() => new Set())
  const [saving, setSaving] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [preparedCount, setPreparedCount] = useState(0)
  const [status, setStatus] = useState('')
  /** 与当前 images 对齐的预拉取结果（按原 index） */
  const preparedRef = useRef<(File | null)[]>([])
  const prepareTokenRef = useRef(0)

  const shareAvailable = useMemo(() => isPhotosShareAvailable(), [isOpen])
  const httpsUpgradeUrl = useMemo(() => getPhotosShareHttpsUpgradeUrl(), [isOpen])
  const needsHttpsUpgrade = Boolean(httpsUpgradeUrl) && !shareAvailable

  const imagesKey = images.map((image) => image.src).join('\n')

  useEffect(() => {
    if (!isOpen) return
    setSelectedIndexes(new Set(images.map((_, index) => index)))
    setSaving(false)
    setPreparedCount(0)
    preparedRef.current = images.map(() => null)

    if (needsHttpsUpgrade) {
      setPreparing(false)
      setStatus(describePhotosShareBlocker())
      return
    }

    const token = prepareTokenRef.current + 1
    prepareTokenRef.current = token
    setPreparing(true)
    setStatus('正在准备图片…')

    const snapshot = images
    void (async () => {
      const result = await preparePreviewImagesForShare(snapshot)
      if (prepareTokenRef.current !== token) return

      preparedRef.current = result.filesByIndex
      setPreparedCount(result.files.length)
      setPreparing(false)
      if (result.errors.length > 0 && result.files.length === 0) {
        setStatus(result.errors[0] || '图片准备失败')
      } else if (result.errors.length > 0) {
        setStatus(`已准备 ${result.files.length} 张，${result.errors.length} 张失败`)
      } else {
        setStatus('已就绪，点「保存到相册」后选「存储到照片」')
      }
    })()
    // imagesKey 稳定表示同一组 URL，避免父组件重渲染导致反复预拉取
  }, [isOpen, imagesKey, needsHttpsUpgrade])

  const allSelected = images.length > 0 && selectedIndexes.size === images.length
  const hasSelection = selectedIndexes.size > 0
  const selectedReadyCount = [...selectedIndexes].filter((index) => preparedRef.current[index]).length
  const canSave =
    !needsHttpsUpgrade &&
    hasSelection &&
    !preparing &&
    !saving &&
    preparedCount > 0 &&
    selectedReadyCount > 0

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

  function handleOpenHttps() {
    if (!httpsUpgradeUrl) return
    onStatus?.('正在打开 HTTPS 页面…')
    window.location.assign(httpsUpgradeUrl)
  }

  function handleSaveToPhotos() {
    if (needsHttpsUpgrade) {
      handleOpenHttps()
      return
    }

    if (!canSave) {
      if (preparing) {
        setStatus('图片还在准备，请稍候再点')
        onStatus?.('图片还在准备，请稍候再点')
      }
      return
    }

    const ordered = [...selectedIndexes].sort((a, b) => a - b)
    const files = ordered
      .map((index) => preparedRef.current[index])
      .filter((file): file is File => Boolean(file))

    if (files.length === 0) {
      setStatus('所选图片尚未准备好，请稍候或重开弹层')
      onStatus?.('所选图片尚未准备好')
      return
    }

    setSaving(true)
    setStatus('请选择「存储到照片」…')
    onStatus?.('请选择「存储到照片」…')

    // 关键：此处不能再 await 拉图；share 必须落在点击调用链里
    void sharePreparedImagesToPhotos(files)
      .then(() => {
        setStatus('若未自动入库，请在分享菜单点「存储到照片」')
        onStatus?.('请在分享菜单选择「存储到照片」')
        onOpenChange(false)
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '保存失败'
        setStatus(message)
        onStatus?.(message)
      })
      .finally(() => {
        setSaving(false)
      })
  }

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <div className="size-9" aria-hidden />
        <p className="text-base font-semibold">选择图片保存到相册</p>
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

      {needsHttpsUpgrade ? (
        <div
          className="mx-4 mb-3 rounded-2xl px-3 py-3 text-sm leading-6"
          style={{ background: 'var(--era-panel)', color: 'var(--era-fg)' }}
        >
          <p className="font-medium">需要 HTTPS 才能存到相册</p>
          <p className="mt-1 text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
            你现在打开的是 HTTP 地址。即使用的是 Safari，系统分享（存储到照片）也只在 HTTPS
            下可用。点下方按钮跳转到安全地址后再保存即可。
          </p>
        </div>
      ) : null}

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
                className="relative aspect-[9/16] h-48 w-auto min-w-[6.75rem] shrink-0 overflow-hidden rounded-2xl border transition"
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
                  className="h-full w-full object-contain"
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

      {status ? (
        <p className="shrink-0 px-4 pb-2 text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
          {status}
        </p>
      ) : null}

      <div
        className="flex shrink-0 items-center justify-between gap-4 border-t px-4 py-3"
        style={{
          borderColor: 'var(--era-border)',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        {needsHttpsUpgrade ? (
          <button
            type="button"
            className="h-11 w-full rounded-full px-8 text-sm font-semibold transition hover:opacity-90"
            style={{ background: 'var(--era-button)', color: 'var(--era-button-fg)' }}
            onClick={handleOpenHttps}
          >
            打开 HTTPS 再保存到相册
          </button>
        ) : (
          <>
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
              disabled={!canSave}
              className="h-11 min-w-[7.5rem] rounded-full px-8 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'var(--era-button)', color: 'var(--era-button-fg)' }}
              onClick={handleSaveToPhotos}
            >
              {preparing
                ? '准备中…'
                : saving
                  ? '唤起分享…'
                  : `保存到相册${hasSelection ? ` ${selectedIndexes.size}` : ''}`}
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  )
}
