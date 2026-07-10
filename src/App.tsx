import { useCallback, useRef, useState } from 'react'
import { Button } from '@heroui/react'
import { Plus, Save } from 'lucide-react'
import { PosterCanvas } from './components/PosterCanvas'
import { MaterialSheet } from './components/MaterialSheet'
import { MaterialBar } from './components/MaterialBar'
import { TextEditorSheet } from './components/TextEditorSheet'
import type { TextAlign, TextElement } from './types'
import { FONT_OPTIONS } from './types'
import { applyTextAlign } from './utils/textLayout'
import { exportPosterToImage, savePosterBlob } from './utils/exportPoster'

function createTextElement(): TextElement {
  return {
    id: crypto.randomUUID(),
    content: '点击编辑文字',
    x: 60,
    y: 120,
    fontSize: 24,
    fontWeight: 400,
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

  const handleApplyAlignToAll = useCallback((align: TextAlign) => {
    setTexts((prev) =>
      prev.map((t) => ({
        ...t,
        ...applyTextAlign(align),
      })),
    )
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
    const canvas = document.getElementById('poster-canvas')
    if (!canvas || !posterUrl) return

    setSaving(true)
    setSaveMessage(null)
    setEditorOpen(false)
    setIsExporting(true)

    try {
      const blob = await exportPosterToImage(canvas)
      await savePosterBlob(blob, `poster-${Date.now()}.png`)
      setSaveMessage('已保存到本地')
    } catch {
      setSaveMessage('保存失败，请重试')
    } finally {
      setIsExporting(false)
      setSaving(false)
      setTimeout(() => setSaveMessage(null), 2500)
    }
  }, [posterUrl])

  const selectedText = texts.find((t) => t.id === selectedId) ?? null

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-white">
      <header className="flex items-center justify-center border-b border-neutral-200 px-4 py-3">
        <h1 className="text-base font-medium tracking-wide text-black">海报编辑器</h1>
      </header>

      <PosterCanvas
        posterUrl={posterUrl}
        texts={texts}
        selectedId={selectedId}
        isExporting={isExporting}
        onSelectText={handleSelectText}
        onUpdateTextPosition={handleUpdatePosition}
        onUploadPoster={handleUploadPoster}
      />

      <MaterialBar
        texts={texts}
        selectedId={selectedId}
        onSelect={handleSelectText}
        onOpenConfig={handleOpenConfig}
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
        onApplyAlignToAll={handleApplyAlignToAll}
        onDelete={handleDeleteText}
      />
    </div>
  )
}

export default App
