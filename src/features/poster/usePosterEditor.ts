import { useCallback, useEffect, useRef, useState } from 'react'
import type { TextElement } from '../../types'
import { exportPosterToImage, savePosterBlob } from '../../utils/exportPoster'
import { loadImageMetaFromFile, type ImageSize } from '../../utils/imageMeta'
import { createTextElement } from './createTextElement'
import { cleanupEditorUi } from './editorUi'

export function usePosterEditor() {
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [posterSize, setPosterSize] = useState<ImageSize | null>(null)
  const [texts, setTexts] = useState<TextElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [materialOpen, setMaterialOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [canvasHeight, setCanvasHeight] = useState(560)

  const posterUrlRef = useRef<string | null>(null)
  const editorSnapshotRef = useRef<TextElement | null>(null)
  const isNewTextRef = useRef(false)

  const clearTransientMessage = useCallback((setter: (value: string | null) => void, message: string) => {
    setter(message)
    window.setTimeout(() => setter(null), 2500)
  }, [])

  const handleUploadPoster = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        clearTransientMessage(setUploadError, '请选择图片文件')
        return
      }

      void (async () => {
        let size: ImageSize = { width: 3, height: 4 }
        try {
          size = await loadImageMetaFromFile(file)
        } catch {
          clearTransientMessage(setUploadError, '无法读取图片信息，已使用默认比例')
        }

        const reader = new FileReader()
        reader.onerror = () => {
          clearTransientMessage(setUploadError, '图片读取失败，请重试')
        }
        reader.onload = () => {
          const result = reader.result
          if (typeof result !== 'string') {
            clearTransientMessage(setUploadError, '图片读取失败，请重试')
            return
          }
          if (posterUrlRef.current?.startsWith('blob:')) {
            URL.revokeObjectURL(posterUrlRef.current)
          }
          posterUrlRef.current = result
          setPosterSize(size)
          setPosterUrl(result)
          setUploadError(null)
        }
        reader.readAsDataURL(file)
      })()
    },
    [clearTransientMessage],
  )

  const handlePosterSizeResolved = useCallback((size: ImageSize) => {
    setPosterSize(size)
  }, [])

  const openEditor = useCallback((id: string, isNew = false) => {
    setTexts((prev) => {
      const text = prev.find((t) => t.id === id)
      if (text) editorSnapshotRef.current = { ...text }
      return prev
    })
    isNewTextRef.current = isNew
    setSelectedId(id)
    setEditorOpen(true)
  }, [])

  const handleEditorClose = useCallback(
    (committed: boolean) => {
      setEditorOpen(false)

      if (!selectedId) {
        editorSnapshotRef.current = null
        isNewTextRef.current = false
        return
      }

      if (committed) {
        editorSnapshotRef.current = null
        isNewTextRef.current = false
        return
      }

      if (isNewTextRef.current) {
        setTexts((prev) => prev.filter((t) => t.id !== selectedId))
        setSelectedId(null)
      } else if (editorSnapshotRef.current) {
        const snapshot = editorSnapshotRef.current
        setTexts((prev) => prev.map((t) => (t.id === selectedId ? snapshot : t)))
      }

      editorSnapshotRef.current = null
      isNewTextRef.current = false
    },
    [selectedId],
  )

  const handleAddText = useCallback(() => {
    const newText = createTextElement()
    setTexts((prev) => [...prev, newText])
    editorSnapshotRef.current = { ...newText }
    isNewTextRef.current = true
    setSelectedId(newText.id)
    setEditorOpen(true)
  }, [])

  const handleSelectText = useCallback(
    (id: string) => {
      if (!id && editorOpen) {
        handleEditorClose(false)
        return
      }
      setSelectedId(id || null)
    },
    [editorOpen, handleEditorClose],
  )

  const handleOpenConfig = useCallback(
    (id: string) => {
      openEditor(id, false)
    },
    [openEditor],
  )

  const handleUpdateText = useCallback((id: string, updates: Partial<TextElement>) => {
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }, [])

  const handleCanvasResize = useCallback((_width: number, height: number) => {
    setCanvasHeight(height)
  }, [])

  const handleDeleteText = useCallback((id: string) => {
    setTexts((prev) => prev.filter((t) => t.id !== id))
    setSelectedId(null)
    editorSnapshotRef.current = null
    isNewTextRef.current = false
    setEditorOpen(false)
  }, [])

  const closeOverlays = useCallback(() => {
    setMaterialOpen(false)
    setEditorOpen(false)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('is-exporting', isExporting)
    return () => document.body.classList.remove('is-exporting')
  }, [isExporting])

  const handleSave = useCallback(async () => {
    const canvasEl = document.getElementById('poster-canvas')
    if (!canvasEl || !posterUrl || !posterSize) return

    const displayWidth = canvasEl.clientWidth
    const displayHeight = canvasEl.clientHeight
    if (displayWidth === 0 || displayHeight === 0) return

    cleanupEditorUi()
    setSaving(true)
    setSaveMessage(null)
    setEditorOpen(false)
    editorSnapshotRef.current = null
    isNewTextRef.current = false
    setSelectedId(null)
    setIsExporting(true)

    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      const blob = await exportPosterToImage(
        posterUrl,
        texts,
        displayWidth,
        displayHeight,
        posterSize.width,
        posterSize.height,
      )
      await savePosterBlob(blob, `poster-${Date.now()}.png`)
      setSaveMessage('已保存到本地')
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败，请重试'
      setSaveMessage(message)
    } finally {
      setIsExporting(false)
      setSaving(false)
      cleanupEditorUi()
      window.setTimeout(() => setSaveMessage(null), 2500)
    }
  }, [posterUrl, posterSize, texts])

  const selectedText = texts.find((t) => t.id === selectedId) ?? null

  return {
    posterUrl,
    posterSize,
    texts,
    selectedId,
    materialOpen,
    setMaterialOpen,
    editorOpen,
    saving,
    isExporting,
    saveMessage,
    uploadError,
    canvasHeight,
    selectedText,
    handleUploadPoster,
    handlePosterSizeResolved,
    handleEditorClose,
    handleAddText,
    handleSelectText,
    handleOpenConfig,
    handleUpdateText,
    handleCanvasResize,
    handleDeleteText,
    handleSave,
    closeOverlays,
  }
}
