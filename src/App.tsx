import { useCallback, useRef, useState } from 'react'
import { Button } from '@heroui/react'
import { Plus, Save } from 'lucide-react'
import { PosterCanvas } from './components/PosterCanvas'
import { MaterialSheet } from './components/MaterialSheet'
import { TextEditorSheet } from './components/TextEditorSheet'
import type { TextElement } from './types'
import { FONT_OPTIONS } from './types'
import { exportPosterToImage, savePosterBlob } from './utils/exportPoster'

function createTextElement(): TextElement {
  return {
    id: crypto.randomUUID(),
    content: '点击编辑文字',
    x: 60,
    y: 120,
    fontSize: 24,
    fontWeight: 400,
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000000',
    fontFamily: FONT_OPTIONS[0].fontFamily,
    fontId: FONT_OPTIONS[0].id,
    textAlign: 'none',
  }
}

function App() {
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [texts, setTexts] = useState<TextElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [materialOpen, setMaterialOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const posterUrlRef = useRef<string | null>(null)

  const handleUploadPoster = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      if (posterUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(posterUrlRef.current)
      }
      posterUrlRef.current = result
      setPosterUrl(result)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleAddText = useCallback(() => {
    const newText = createTextElement()
    setTexts((prev) => [...prev, newText])
    setSelectedId(newText.id)
    setEditorOpen(true)
  }, [])

  const handleSelectText = useCallback((id: string) => {
    setSelectedId(id || null)
    if (!id) setEditorOpen(false)
  }, [])

  const handleOpenConfig = useCallback((id: string) => {
    setSelectedId(id)
    setEditorOpen(true)
  }, [])

  const handleUpdateText = useCallback((id: string, updates: Partial<TextElement>) => {
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }, [])

  const handleUpdatePosition = useCallback((id: string, x: number, y: number) => {
    setTexts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, x, y, textAlign: 'none' as const } : t)),
    )
  }, [])

  const handleDeleteText = useCallback((id: string) => {
    setTexts((prev) => prev.filter((t) => t.id !== id))
    setSelectedId(null)
    setEditorOpen(false)
  }, [])

  const handleSave = useCallback(async () => {
    const canvasEl = document.getElementById('poster-canvas')
    if (!canvasEl || !posterUrl) return

    const rect = canvasEl.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    setSaving(true)
    setSaveMessage(null)
    setEditorOpen(false)
    setSelectedId(null)
    setIsExporting(true)

    try {
      await new Promise((r) => setTimeout(r, 80))
      const blob = await exportPosterToImage(posterUrl, texts, rect.width, rect.height)
      await savePosterBlob(blob, `poster-${Date.now()}.png`)
      setSaveMessage('已保存到本地')
    } catch {
      setSaveMessage('保存失败，请重试')
    } finally {
      setIsExporting(false)
      setSaving(false)
      setTimeout(() => setSaveMessage(null), 2500)
    }
  }, [posterUrl, texts])

  const selectedText = texts.find((t) => t.id === selectedId) ?? null

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden bg-white">
      <header className="flex items-center justify-center border-b border-neutral-200 px-4 py-3">
        <h1 className="text-base font-medium tracking-wide text-black">海报编辑器</h1>
      </header>

      <PosterCanvas
        posterUrl={posterUrl}
        texts={texts}
        selectedId={selectedId}
        isExporting={isExporting}
        onSelectText={handleSelectText}
        onOpenConfig={handleOpenConfig}
        onUpdateTextPosition={handleUpdatePosition}
        onUploadPoster={handleUploadPoster}
      />

      <footer className="sticky bottom-0 border-t border-neutral-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {saveMessage && (
          <p className="mb-2 text-center text-xs text-neutral-600">{saveMessage}</p>
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

      <MaterialSheet
        isOpen={materialOpen}
        onOpenChange={setMaterialOpen}
        onAddText={handleAddText}
      />

      <TextEditorSheet
        text={selectedText}
        isOpen={editorOpen}
        onOpenChange={setEditorOpen}
        onUpdate={handleUpdateText}
        onDelete={handleDeleteText}
      />
    </div>
  )
}

export default App
