import { useEffect, useMemo, useRef, useState } from 'react'
import type { FontOption } from '../../data/fonts'
import { getFontById } from '../../data/fonts'
import { ensureFontReady } from '../../utils/fontLoad'
import { MarkdownEditorDock } from '../../components/MarkdownEditorDock'
import { GraphicPage } from './GraphicPage'
import { GraphicSaveImagesSheet } from './GraphicSaveImagesSheet'
import { GraphicTextConfigSheet } from './GraphicTextConfigSheet'
import { GraphicTextToolbar } from './GraphicTextToolbar'
import {
  GraphicAspectStrip,
  GraphicFontSizeDetailStrip,
  GraphicFontStrip,
  GraphicTemplateStrip,
} from './GraphicToolbarStrips'
import type { FontSizeNav, FontSizeTarget, GraphicConfigPanel, ToolbarStrip } from './graphicConfigPanels'
import { paginateMarkdown, getGraphicLayout } from './layout'
import { computeGraphicPageDisplaySize } from './graphicPreviewLayout'
import {
  DEFAULT_GRAPHIC_TEXT_CONFIG,
  DEFAULT_MARKDOWN,
  type GraphicAspectRatio,
  type GraphicTextConfig,
} from './types'

const PAGER_PAGE_PADDING = 32

interface GraphicTextWorkspaceProps {
  defaultBackgroundUrl: string | null
}

function isFontSizeTarget(nav: FontSizeNav): nav is FontSizeTarget {
  return nav === 'title' || nav === 'heading' || nav === 'body'
}

export function GraphicTextWorkspace({ defaultBackgroundUrl }: GraphicTextWorkspaceProps) {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN)
  const [config, setConfig] = useState<GraphicTextConfig>(() => ({
    ...DEFAULT_GRAPHIC_TEXT_CONFIG,
    backgroundUrl: defaultBackgroundUrl,
  }))
  const [configPanel, setConfigPanel] = useState<GraphicConfigPanel | null>(null)
  const [toolbarStrip, setToolbarStrip] = useState<ToolbarStrip | null>(null)
  const [fontSizeNav, setFontSizeNav] = useState<FontSizeNav>(null)
  const [showSafeArea, setShowSafeArea] = useState(false)
  const [saveSheetOpen, setSaveSheetOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [pasteError, setPasteError] = useState('')
  const pagerRef = useRef<HTMLDivElement>(null)
  const [pagerSize, setPagerSize] = useState({ width: 0, height: 0 })

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

  useEffect(() => {
    const pager = pagerRef.current
    if (!pager) return

    const updateSize = () => {
      setPagerSize({ width: pager.clientWidth, height: pager.clientHeight })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(pager)
    window.addEventListener('resize', updateSize)
    window.visualViewport?.addEventListener('resize', updateSize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateSize)
      window.visualViewport?.removeEventListener('resize', updateSize)
    }
  }, [])

  const pages = useMemo(() => paginateMarkdown(markdown, config), [markdown, config])

  const pagerPageSize = useMemo(() => {
    const layout = getGraphicLayout(config)
    if (pagerSize.width > 0 && pagerSize.height > 0) {
      return computeGraphicPageDisplaySize(
        layout.aspectRatio,
        pagerSize.width - PAGER_PAGE_PADDING,
        pagerSize.height - PAGER_PAGE_PADDING,
      )
    }
    return computeGraphicPageDisplaySize(
      layout.aspectRatio,
      window.innerWidth - PAGER_PAGE_PADDING,
      window.innerHeight - 200,
    )
  }, [config, pagerSize])

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

  const closeOverlays = () => {
    setToolbarStrip(null)
    setFontSizeNav(null)
  }

  const handleSelectStrip = (strip: ToolbarStrip) => {
    setEditorOpen(false)
    setConfigPanel(null)
    setFontSizeNav(null)
    setToolbarStrip((current) => (current === strip ? null : strip))
  }

  const handleSelectPanel = (panel: GraphicConfigPanel) => {
    setEditorOpen(false)
    setToolbarStrip(null)
    setFontSizeNav(null)
    setConfigPanel((current) => (current === panel ? null : panel))
  }

  const handleOpenFontSizeMenu = () => {
    setEditorOpen(false)
    setConfigPanel(null)
    setToolbarStrip(null)
    setFontSizeNav((current) => {
      if (current === null) return 'menu'
      if (current === 'menu') return null
      return current
    })
  }

  const handleFontSizeBack = () => {
    setFontSizeNav(null)
  }

  const handleSelectFontSizeTarget = (target: FontSizeTarget) => {
    setFontSizeNav((current) => (current === target ? 'menu' : target))
  }

  const handleEdit = () => {
    setConfigPanel(null)
    setToolbarStrip(null)
    setFontSizeNav(null)
    setEditorOpen((current) => !current)
  }

  const handleToggleSafeArea = () => {
    setConfigPanel(null)
    setToolbarStrip(null)
    setFontSizeNav(null)
    setShowSafeArea((current) => !current)
  }

  const handleFontSelect = (font: FontOption) => {
    setConfig((current) => ({ ...current, fontId: font.id, fontFamily: font.fontFamily }))
    if (font.source !== 'system') {
      void ensureFontReady(font, markdown || font.sample)
    }
  }

  const handleAspectSelect = (aspectRatio: GraphicAspectRatio) => {
    setConfig((current) => ({ ...current, aspectRatio }))
  }

  const handleSave = () => {
    setConfigPanel(null)
    setToolbarStrip(null)
    setFontSizeNav(null)
    setEditorOpen(false)
    setSaveSheetOpen(true)
  }

  const showStripBackdrop = toolbarStrip !== null || isFontSizeTarget(fontSizeNav)

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-100">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {showStripBackdrop && (
          <button
            type="button"
            aria-label="关闭选项"
            className="absolute inset-0 z-10"
            onClick={closeOverlays}
          />
        )}

        <div
          ref={pagerRef}
          className="graphic-pager relative z-0 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
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
                showSafeArea={showSafeArea}
                className="rounded-xl shadow-lg"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-20 shrink-0">
        {toolbarStrip === 'font' && (
          <GraphicFontStrip selectedFontId={config.fontId} onSelect={handleFontSelect} />
        )}
        {toolbarStrip === 'aspect' && (
          <GraphicAspectStrip selected={config.aspectRatio} onSelect={handleAspectSelect} />
        )}
        {toolbarStrip === 'template' && (
          <GraphicTemplateStrip
            config={config}
            onUpdate={(updates) => setConfig((current) => ({ ...current, ...updates }))}
            onBackgroundUpload={handleBackgroundUpload}
          />
        )}
        {isFontSizeTarget(fontSizeNav) && (
          <GraphicFontSizeDetailStrip
            target={fontSizeNav}
            config={config}
            onUpdate={(updates) => setConfig((current) => ({ ...current, ...updates }))}
          />
        )}

        <GraphicTextToolbar
          activePanel={configPanel}
          activeStrip={toolbarStrip}
          fontSizeNav={fontSizeNav}
          editorOpen={editorOpen}
          safeAreaOpen={showSafeArea}
          saveDisabled={pages.length === 0}
          onEdit={handleEdit}
          onSelectStrip={handleSelectStrip}
          onSelectPanel={handleSelectPanel}
          onOpenFontSizeMenu={handleOpenFontSizeMenu}
          onFontSizeBack={handleFontSizeBack}
          onSelectFontSizeTarget={handleSelectFontSizeTarget}
          onToggleSafeArea={handleToggleSafeArea}
          onSave={handleSave}
        />
      </div>

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
          showSafeArea={showSafeArea}
          onOpenChange={(open) => {
            if (!open) setConfigPanel(null)
          }}
          onUpdate={(updates) => setConfig((current) => ({ ...current, ...updates }))}
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
