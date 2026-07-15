import { useEffect, useMemo, useRef, useState } from 'react'
import { MarkdownEditorDock } from '../../components/MarkdownEditorDock'
import { GraphicPage } from './GraphicPage'
import { GraphicSaveImagesSheet } from './GraphicSaveImagesSheet'
import { GraphicTextConfigSheet } from './GraphicTextConfigSheet'
import { GraphicTextToolbar } from './GraphicTextToolbar'
import type { GraphicConfigPanel } from './graphicConfigPanels'
import { paginateMarkdown, getGraphicLayout } from './layout'
import { computeWorkspacePagerPageSize } from './graphicPreviewLayout'
import { getFontById } from '../../data/fonts'
import { ensureFontReady } from '../../utils/fontLoad'
import {
  DEFAULT_GRAPHIC_TEXT_CONFIG,
  DEFAULT_MARKDOWN,
  type GraphicTextConfig,
} from './types'

interface GraphicTextWorkspaceProps {
  defaultBackgroundUrl: string | null
}

export function GraphicTextWorkspace({ defaultBackgroundUrl }: GraphicTextWorkspaceProps) {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN)
  const [config, setConfig] = useState<GraphicTextConfig>(() => ({
    ...DEFAULT_GRAPHIC_TEXT_CONFIG,
    backgroundUrl: defaultBackgroundUrl,
  }))
  const [configPanel, setConfigPanel] = useState<GraphicConfigPanel | null>(null)
  const [saveSheetOpen, setSaveSheetOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [activePage, setActivePage] = useState(0)
  const [pasteError, setPasteError] = useState('')
  const pagerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!defaultBackgroundUrl) return
    setConfig((current) => {
      if (current.backgroundType !== 'reference') return current
      return { ...current, backgroundUrl: defaultBackgroundUrl }
    })
  }, [defaultBackgroundUrl])

  useEffect(() => {
    const font = getFontById(config.fontId)
    if (font.source === 'system') return
    void ensureFontReady(font, markdown || font.sample)
  }, [config.fontId, markdown])

  const pages = useMemo(() => paginateMarkdown(markdown, config), [markdown, config])

  useEffect(() => {
    setActivePage((current) => Math.min(current, Math.max(0, pages.length - 1)))
  }, [pages.length])

  const pagerPageSize = useMemo(() => {
    const layout = getGraphicLayout(config)
    return computeWorkspacePagerPageSize(layout.aspectRatio)
  }, [config])

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setMarkdown(text)
      setPasteError('')
    } catch {
      setPasteError('请允许读取剪贴板后重试')
      window.setTimeout(() => setPasteError(''), 2200)
    }
  }

  const handleBackgroundUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') return
      setConfig((current) => ({
        ...current,
        backgroundType: 'reference',
        backgroundUrl: result,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handlePagerScroll = () => {
    const pager = pagerRef.current
    if (!pager || !pager.clientWidth) return
    setActivePage(Math.round(pager.scrollLeft / pager.clientWidth))
  }

  const handleSelectPanel = (panel: GraphicConfigPanel) => {
    setEditorOpen(false)
    setConfigPanel((current) => (current === panel ? null : panel))
  }

  const handleEdit = () => {
    setConfigPanel(null)
    setEditorOpen((current) => !current)
  }

  const handleSave = () => {
    setConfigPanel(null)
    setEditorOpen(false)
    setSaveSheetOpen(true)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-100">
      <div className="flex h-12 shrink-0 items-center justify-center border-b border-neutral-200 bg-white px-3">
        <div className="text-center">
          <p className="text-sm font-medium">图文预览</p>
          <p className="text-[11px] text-neutral-500">
            {pages.length ? `${activePage + 1} / ${pages.length}` : '0 / 0'}
          </p>
        </div>
      </div>

      <div
        ref={pagerRef}
        className="graphic-pager flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
        onScroll={handlePagerScroll}
      >
        {pages.map((page) => (
          <div
            key={page.index}
            className="flex h-full w-full shrink-0 snap-center items-center justify-center p-4"
          >
            <GraphicPage
              page={page}
              config={config}
              markdown={markdown}
              displayWidth={pagerPageSize?.width}
              className="rounded-xl shadow-lg"
            />
          </div>
        ))}
      </div>

      <GraphicTextToolbar
        activePanel={configPanel}
        editorOpen={editorOpen}
        saveDisabled={pages.length === 0}
        onEdit={handleEdit}
        onSelectPanel={handleSelectPanel}
        onSave={handleSave}
      />

      {editorOpen && (
        <MarkdownEditorDock
          value={markdown}
          onChange={setMarkdown}
          onPaste={handlePaste}
          pasteError={pasteError}
          onCommit={() => setEditorOpen(false)}
          onDismiss={() => setEditorOpen(false)}
        />
      )}

      {configPanel && (
        <GraphicTextConfigSheet
          isOpen={configPanel !== null}
          panel={configPanel}
          config={config}
          markdown={markdown}
          onOpenChange={(open) => {
            if (!open) setConfigPanel(null)
          }}
          onUpdate={(updates) => setConfig((current) => ({ ...current, ...updates }))}
          onBackgroundUpload={handleBackgroundUpload}
        />
      )}

      <GraphicSaveImagesSheet
        isOpen={saveSheetOpen}
        pages={pages}
        config={config}
        markdown={markdown}
        onOpenChange={setSaveSheetOpen}
      />
    </div>
  )
}
