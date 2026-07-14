import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@heroui/react'
import { Plus, Save } from 'lucide-react'
import { PosterCanvas } from './components/PosterCanvas'
import { MaterialSheet } from './components/MaterialSheet'
import { TextEditorSheet } from './components/TextEditorSheet'
import { TopModeTabs, type AppMode } from './components/TopModeTabs'
import type { TextElement } from './types'
import { FONT_OPTIONS } from './data/fonts'
import { exportPosterToImage, savePosterBlob } from './utils/exportPoster'
import { loadImageMetaFromFile, type ImageSize } from './utils/imageMeta'
import { GraphicTextWorkspace } from './features/graphic-text/GraphicTextWorkspace'

function cleanupEditorUi() {
  document.body.classList.remove('keyboard-dock-open')
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

function createTextElement(): TextElement {
  return {
    id: crypto.randomUUID(),
    content: '',
    x: 60,
    y: 120,
    fontSize: 24,
    fontWeight: 400,
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#EF4444',
    fontFamily: FONT_OPTIONS[0].fontFamily,
    fontId: FONT_OPTIONS[0].id,
    textAlign: 'none',
    textStylePreset: 'plain',
    backgroundColor: null,
  }
}

function App() {
  const [mode, setMode] = useState<AppMode>('poster')
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

  const handleUploadPoster = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('请选择图片文件')
      window.setTimeout(() => setUploadError(null), 2500)
      return
    }

    void (async () => {
      let size: ImageSize = { width: 3, height: 4 }
      try {
        size = await loadImageMetaFromFile(file)
      } catch {
        setUploadError('无法读取图片信息，已使用默认比例')
        window.setTimeout(() => setUploadError(null), 2500)
      }

      const reader = new FileReader()
      reader.onerror = () => {
        setUploadError('图片读取失败，请重试')
        window.setTimeout(() => setUploadError(null), 2500)
      }
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') {
          setUploadError('图片读取失败，请重试')
          window.setTimeout(() => setUploadError(null), 2500)
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
  }, [])

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
      setTimeout(() => setSaveMessage(null), 2500)
    }
  }, [posterUrl, posterSize, texts])

  const selectedText = texts.find((t) => t.id === selectedId) ?? null

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 items-center justify-center border-b border-neutral-200 px-4 py-2">
        <TopModeTabs
          value={mode}
          onChange={(nextMode) => {
            setMode(nextMode)
            setMaterialOpen(false)
            setEditorOpen(false)
          }}
        />
      </header>

      {mode === 'poster' ? (
        <>
          <PosterCanvas
            posterUrl={posterUrl}
            posterSize={posterSize}
            texts={texts}
            selectedId={selectedId}
            isExporting={isExporting}
            onSelectText={handleSelectText}
            onOpenConfig={handleOpenConfig}
            onDeleteText={handleDeleteText}
            onUpdateText={handleUpdateText}
            onUploadPoster={handleUploadPoster}
            onCanvasResize={handleCanvasResize}
            onPosterSizeResolved={handlePosterSizeResolved}
          />

          <footer className="sticky bottom-0 border-t border-neutral-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {(saveMessage || uploadError) && (
              <p className="mb-2 text-center text-xs text-neutral-600">{saveMessage || uploadError}</p>
            )}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1 border-neutral-300 bg-white text-black"
                isDisabled={!posterUrl}
                onPress={() => setMaterialOpen(true)}
              >
                <Plus size={18} />
                添加素材
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-black text-white"
                isDisabled={!posterUrl || saving}
                onPress={handleSave}
              >
                <Save size={18} />
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </footer>
        </>
      ) : (
        <GraphicTextWorkspace defaultBackgroundUrl={posterUrl} />
      )}

      {mode === 'poster' && (
        <>
          <MaterialSheet
            isOpen={materialOpen}
            onOpenChange={setMaterialOpen}
            onAddText={handleAddText}
          />

          <TextEditorSheet
            text={selectedText}
            isOpen={editorOpen}
            canvasHeight={canvasHeight}
            onClose={handleEditorClose}
            onUpdate={handleUpdateText}
          />
        </>
      )}
    </div>
  )
}

export default App
