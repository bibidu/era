import { useCallback, useRef, useState } from 'react'
import { Button } from '@heroui/react'
import html2canvas from 'html2canvas'
import { Plus, Save } from 'lucide-react'
import { PosterCanvas } from './components/PosterCanvas'
import { MaterialSheet } from './components/MaterialSheet'
import { TextEditorSheet } from './components/TextEditorSheet'
import type { TextElement } from './types'
import { FONT_OPTIONS } from './types'

function createTextElement(): TextElement {
  return {
    id: crypto.randomUUID(),
    content: '点击编辑文字',
    x: 60,
    y: 120,
    fontSize: 24,
    fontWeight: 400,
    color: '#000000',
    fontFamily: FONT_OPTIONS[0].value,
  }
}

function App() {
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [texts, setTexts] = useState<TextElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [materialOpen, setMaterialOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const posterUrlRef = useRef<string | null>(null)

  const handleUploadPoster = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      if (posterUrlRef.current) URL.revokeObjectURL(posterUrlRef.current)
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
    setSelectedId(id)
    setEditorOpen(true)
  }, [])

  const handleUpdateText = useCallback((id: string, updates: Partial<TextElement>) => {
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }, [])

  const handleUpdatePosition = useCallback((id: string, x: number, y: number) => {
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)))
  }, [])

  const handleDeleteText = useCallback((id: string) => {
    setTexts((prev) => prev.filter((t) => t.id !== id))
    setSelectedId(null)
  }, [])

  const handleSave = useCallback(async () => {
    const canvas = document.getElementById('poster-canvas')
    if (!canvas || !posterUrl) return

    setSaving(true)
    setEditorOpen(false)

    try {
      await new Promise((resolve) => setTimeout(resolve, 100))

      const result = await html2canvas(canvas, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
        logging: false,
      })

      const link = document.createElement('a')
      link.download = `poster-${Date.now()}.png`
      link.href = result.toDataURL('image/png')
      link.click()
    } finally {
      setSaving(false)
    }
  }, [posterUrl])

  const selectedText = texts.find((t) => t.id === selectedId) ?? null

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-white">
      <header className="flex items-center justify-center border-b border-neutral-100 px-4 py-3">
        <h1 className="text-base font-medium tracking-wide text-neutral-900">海报编辑器</h1>
      </header>

      <PosterCanvas
        posterUrl={posterUrl}
        texts={texts}
        selectedId={selectedId}
        onSelectText={handleSelectText}
        onUpdateTextPosition={handleUpdatePosition}
        onUploadPoster={handleUploadPoster}
      />

      <footer className="sticky bottom-0 border-t border-neutral-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            isDisabled={!posterUrl}
            onPress={() => setMaterialOpen(true)}
          >
            <Plus size={18} />
            添加素材
          </Button>
          <Button
            variant="primary"
            className="flex-1"
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
