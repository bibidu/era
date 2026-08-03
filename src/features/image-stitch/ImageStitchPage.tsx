import { Download, GripVertical, ImagePlus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createId } from '../../utils/id'
import { stitchImagesVertical } from './stitchImagesVertical'

interface StitchItem {
  id: string
  file: File
  previewUrl: string
  width: number
  height: number
}

function revokePreview(url: string) {
  try {
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}

async function fileToStitchItem(file: File): Promise<StitchItem> {
  const previewUrl = URL.createObjectURL(file)
  const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error(`无法读取图片：${file.name}`))
    img.src = previewUrl
  })
  return {
    id: createId(),
    file,
    previewUrl,
    width: dims.width,
    height: dims.height,
  }
}

export function ImageStitchPage() {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<StitchItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [gapPx, setGapPx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultSize, setResultSize] = useState<{ w: number; h: number; bytes: number } | null>(
    null,
  )

  const itemsRef = useRef(items)
  const resultUrlRef = useRef(resultUrl)
  itemsRef.current = items
  resultUrlRef.current = resultUrl

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) revokePreview(item.previewUrl)
      if (resultUrlRef.current) revokePreview(resultUrlRef.current)
    }
  }, [])

  const clearResult = useCallback(() => {
    setResultUrl((prev) => {
      if (prev) revokePreview(prev)
      return null
    })
    setResultSize(null)
  }, [])

  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
      if (!files.length) {
        setError('请选择图片文件（png / jpg / webp 等）')
        return
      }
      setError(null)
      clearResult()
      try {
        const next = await Promise.all(files.map((f) => fileToStitchItem(f)))
        setItems((prev) => [...prev, ...next])
      } catch (e) {
        setError(e instanceof Error ? e.message : '添加图片失败')
      }
    },
    [clearResult],
  )

  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const target = prev.find((item) => item.id === id)
        if (target) revokePreview(target.previewUrl)
        return prev.filter((item) => item.id !== id)
      })
      clearResult()
    },
    [clearResult],
  )

  const clearAll = useCallback(() => {
    setItems((prev) => {
      for (const item of prev) revokePreview(item.previewUrl)
      return []
    })
    clearResult()
    setError(null)
  }, [clearResult])

  const reorder = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return
    setItems((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === fromId)
      const toIndex = prev.findIndex((item) => item.id === toId)
      if (fromIndex < 0 || toIndex < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      if (!moved) return prev
      next.splice(toIndex, 0, moved)
      return next
    })
    clearResult()
  }, [clearResult])

  const handleStitch = useCallback(async () => {
    if (items.length < 1) {
      setError('请先添加至少一张图片')
      return
    }
    setBusy(true)
    setError(null)
    clearResult()
    try {
      const blob = await stitchImagesVertical(
        items.map((item) => item.file),
        { gapPx, backgroundColor: '#FFFFFF' },
      )
      const url = URL.createObjectURL(blob)
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = () => reject(new Error('结果图读取失败'))
        img.src = url
      })
      setResultUrl(url)
      setResultSize({ w: dims.w, h: dims.h, bytes: blob.size })
    } catch (e) {
      setError(e instanceof Error ? e.message : '拼接失败')
    } finally {
      setBusy(false)
    }
  }, [clearResult, gapPx, items])

  const handleDownload = useCallback(() => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = `stitch-vertical-${Date.now()}.png`
    a.click()
  }, [resultUrl])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-base font-semibold">纵向拼图</h1>
          <p className="mt-1 text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
            上传多张图片，拖拽调整顺序，按顺序纵向拼成一张长图。
          </p>
        </div>

        <label
          htmlFor={inputId}
          className="mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 transition"
          style={{
            borderColor: dragOver ? 'var(--era-fg)' : 'var(--era-border)',
            background: dragOver ? 'var(--era-panel)' : 'var(--era-input)',
            color: 'var(--era-muted)',
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            void addFiles(e.dataTransfer.files)
          }}
        >
          <ImagePlus size={22} style={{ color: 'var(--era-fg)' }} />
          <span className="text-sm" style={{ color: 'var(--era-fg)' }}>
            点击或拖入图片
          </span>
          <span className="text-xs">支持多选 · png / jpg / webp</span>
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>

        <div className="mb-3 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--era-muted)' }}>
            间距
            <input
              type="number"
              min={0}
              max={200}
              value={gapPx}
              onChange={(e) => {
                setGapPx(Math.max(0, Math.min(200, Number(e.target.value) || 0)))
                clearResult()
              }}
              className="w-16 rounded-lg border px-2 py-1.5 text-sm outline-none"
              style={{
                borderColor: 'var(--era-border)',
                background: 'var(--era-input)',
                color: 'var(--era-fg)',
              }}
            />
            px
          </label>
          {items.length > 0 ? (
            <button
              type="button"
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--era-muted)' }}
              onClick={clearAll}
            >
              <Trash2 size={14} />
              清空
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p className="py-8 text-center text-xs" style={{ color: 'var(--era-muted)' }}>
            尚未添加图片
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item, index) => {
              const isDragging = draggingId === item.id
              const isOver = overId === item.id && draggingId !== item.id
              return (
                <li
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingId(item.id)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', item.id)
                  }}
                  onDragEnd={() => {
                    setDraggingId(null)
                    setOverId(null)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (overId !== item.id) setOverId(item.id)
                  }}
                  onDragLeave={() => {
                    if (overId === item.id) setOverId(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const fromId = e.dataTransfer.getData('text/plain') || draggingId
                    if (fromId) reorder(fromId, item.id)
                    setDraggingId(null)
                    setOverId(null)
                  }}
                  className="flex items-center gap-3 rounded-2xl border px-3 py-2 transition"
                  style={{
                    borderColor: isOver ? 'var(--era-fg)' : 'var(--era-border)',
                    background: 'var(--era-panel)',
                    opacity: isDragging ? 0.45 : 1,
                    boxShadow: isOver ? 'inset 0 0 0 1px var(--era-fg)' : undefined,
                  }}
                >
                  <span
                    className="flex shrink-0 cursor-grab touch-none items-center"
                    style={{ color: 'var(--era-muted)' }}
                    aria-hidden
                  >
                    <GripVertical size={16} />
                  </span>
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-medium"
                    style={{ background: 'var(--era-tab-track)', color: 'var(--era-fg)' }}
                  >
                    {index + 1}
                  </span>
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    draggable={false}
                    className="size-14 shrink-0 rounded-lg object-cover"
                    style={{ background: 'var(--era-input)' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm" style={{ color: 'var(--era-fg)' }}>
                      {item.file.name}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--era-muted)' }}>
                      {item.width}×{item.height}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`移除 ${item.file.name}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ color: 'var(--era-muted)' }}
                    onClick={() => removeItem(item.id)}
                  >
                    <X size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {error ? (
          <p className="mt-3 text-xs" style={{ color: '#ef4444' }}>
            {error}
          </p>
        ) : null}

        {resultUrl && resultSize ? (
          <div
            className="mt-5 overflow-hidden rounded-2xl border"
            style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
          >
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2" style={{ borderColor: 'var(--era-border)' }}>
              <p className="text-xs" style={{ color: 'var(--era-muted)' }}>
                结果 {resultSize.w}×{resultSize.h} · {(resultSize.bytes / 1024).toFixed(1)} KB
              </p>
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
                style={{ background: 'var(--era-tab-active)', color: 'var(--era-fg)' }}
                onClick={handleDownload}
              >
                <Download size={14} />
                下载 PNG
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-3">
              <img
                src={resultUrl}
                alt="纵向拼图结果"
                className="mx-auto w-full max-w-sm"
                style={{ background: '#fff' }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="shrink-0 border-t px-4 py-3"
        style={{
          borderColor: 'var(--era-border)',
          background: 'var(--era-header)',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          type="button"
          disabled={busy || items.length === 0}
          className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition disabled:opacity-40"
          style={{ background: 'var(--era-fg)', color: 'var(--era-bg)' }}
          onClick={() => void handleStitch()}
        >
          {busy ? '拼接中…' : `按顺序纵向拼接（${items.length} 张）`}
        </button>
      </div>
    </div>
  )
}
