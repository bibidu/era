import { useEffect, useMemo, useRef, useState } from 'react'
import type { FontOption } from '../../data/fonts'
import { getFontById } from '../../data/fonts'
import { ensureFontReady } from '../../utils/fontLoad'
import { MarkdownEditorDock } from '../../components/MarkdownEditorDock'
import { GraphicPage } from './GraphicPage'
import { GraphicSaveImagesSheet } from './GraphicSaveImagesSheet'
import { GraphicContentSheet } from './GraphicContentSheet'
import { GraphicTextConfigSheet, createHighlightPreviewDraft } from './GraphicTextConfigSheet'
import { GraphicTextToolbar } from './GraphicTextToolbar'
import {
  GraphicAspectStrip,
  GraphicTextAdjustFieldStrip,
  GraphicTopTextStrip,
} from './GraphicToolbarStrips'
import {
  GraphicTemplateSolidStrip,
  GraphicTemplateTextureStrip,
} from './GraphicTemplateStrips'
import type {
  FontSizeNav,
  FontSizeTarget,
  GraphicConfigPanel,
  TemplateNav,
  TextAdjustField,
  ToolbarStrip,
} from './graphicConfigPanels'
import { paginateDocument, getGraphicLayout } from './layout'
import {
  createDefaultDocument,
  getDocumentMarkdown,
  normalizeDocument,
  updateContentBlock,
  type GraphicDocument,
} from './document'
import { collectGraphicFontIds } from './graphicTextFonts'
import { computeGraphicPageDisplaySize } from './graphicPreviewLayout'
import { getViewportHeight, readCachedSheetHeight } from './topBar'
import {
  DEFAULT_GRAPHIC_TEXT_CONFIG,
  type GraphicAspectRatio,
  type GraphicTextConfig,
} from './types'

const PAGER_PAGE_PADDING = 32
const PAGER_SHEET_PADDING = PAGER_PAGE_PADDING / 2

interface GraphicTextWorkspaceProps {
  defaultBackgroundUrl: string | null
}

function isTextAdjustTarget(nav: FontSizeNav): nav is FontSizeTarget {
  return nav === 'title' || nav === 'heading' || nav === 'body' || nav === 'code'
}

export function GraphicTextWorkspace({ defaultBackgroundUrl }: GraphicTextWorkspaceProps) {
  const [document, setDocument] = useState<GraphicDocument>(() => normalizeDocument(createDefaultDocument()))
  const markdown = useMemo(() => getDocumentMarkdown(document), [document])
  const [config, setConfig] = useState<GraphicTextConfig>(() => ({
    ...DEFAULT_GRAPHIC_TEXT_CONFIG,
    backgroundUrl: defaultBackgroundUrl,
  }))
  const [configPanel, setConfigPanel] = useState<GraphicConfigPanel | null>(null)
  const [toolbarStrip, setToolbarStrip] = useState<ToolbarStrip | null>(null)
  const [templateNav, setTemplateNav] = useState<TemplateNav>(null)
  const [fontSizeNav, setFontSizeNav] = useState<FontSizeNav>(null)
  const [textAdjustField, setTextAdjustField] = useState<TextAdjustField | null>(null)
  const [showSafeArea, setShowSafeArea] = useState(false)
  const [saveSheetOpen, setSaveSheetOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingMarkdownBlockId, setEditingMarkdownBlockId] = useState<string | null>(null)
  const [selectedContentBlockId, setSelectedContentBlockId] = useState<string | null>(null)
  const [pasteError, setPasteError] = useState('')
  const pagerRef = useRef<HTMLDivElement>(null)
  const toolbarDockRef = useRef<HTMLDivElement>(null)
  const templateRefInputRef = useRef<HTMLInputElement>(null)
  const configRef = useRef(config)
  configRef.current = config
  const [pagerSize, setPagerSize] = useState({ width: 0, height: 0 })
  const [sheetHeight, setSheetHeight] = useState(0)
  const [toolbarDockHeight, setToolbarDockHeight] = useState(0)
  const [highlightPreview, setHighlightPreview] = useState(() => createHighlightPreviewDraft(config))

  useEffect(() => {
    if (!defaultBackgroundUrl) return
    setConfig((current) => {
      if (current.backgroundType !== 'reference') return current
      return { ...current, backgroundUrl: defaultBackgroundUrl }
    })
  }, [defaultBackgroundUrl])

  useEffect(() => {
    for (const fontId of collectGraphicFontIds(config)) {
      const font = getFontById(fontId)
      if (font.source === 'system') continue
      void ensureFontReady(font, font.sample)
    }
  }, [config.titleFontId, config.headingFontId, config.bodyFontId, config.codeFontId])

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
  }, [configPanel, sheetHeight, toolbarDockHeight])

  useEffect(() => {
    const dock = toolbarDockRef.current
    if (!dock) return

    const updateDockHeight = () => {
      setToolbarDockHeight(dock.offsetHeight)
    }

    updateDockHeight()
    const observer = new ResizeObserver(updateDockHeight)
    observer.observe(dock)
    return () => observer.disconnect()
  }, [configPanel, toolbarStrip, templateNav, fontSizeNav, textAdjustField])

  useEffect(() => {
    if (!configPanel) {
      setSheetHeight(0)
      return
    }

    setSheetHeight(readCachedSheetHeight(getViewportHeight()))
    if (configPanel === 'highlight') {
      setHighlightPreview(createHighlightPreviewDraft(configRef.current))
    }
    if (configPanel === 'content') {
      setSelectedContentBlockId(null)
      setDocument((current) => normalizeDocument(current))
    }
  }, [configPanel])

  const previewConfig = useMemo(() => {
    if (configPanel !== 'highlight') return config
    return {
      ...config,
      underlineHighlightColors: highlightPreview.underlineHighlightColors,
      brushHighlightColors: highlightPreview.brushHighlightColors ?? {},
      quoteHighlightColors: highlightPreview.quoteHighlightColors,
      circleHighlightColors: highlightPreview.circleHighlightColors,
      highlightPickerColor: highlightPreview.highlightPickerColor,
    }
  }, [config, configPanel, highlightPreview])

  const pages = useMemo(() => paginateDocument(document, previewConfig), [document, previewConfig])

  const sheetOpen = configPanel !== null && sheetHeight > 0
  const pagerPagePadding = sheetOpen ? PAGER_SHEET_PADDING : PAGER_PAGE_PADDING

  const pagerPageSize = useMemo(() => {
    const layout = getGraphicLayout(config)
    if (pagerSize.width > 0 && pagerSize.height > 0) {
      return computeGraphicPageDisplaySize(
        layout.aspectRatio,
        pagerSize.width - pagerPagePadding,
        pagerSize.height - pagerPagePadding,
      )
    }
    return computeGraphicPageDisplaySize(
      layout.aspectRatio,
      window.innerWidth - pagerPagePadding,
      getViewportHeight() -
        (sheetOpen ? sheetHeight : toolbarDockHeight || 200),
    )
  }, [config, pagerSize, sheetOpen, sheetHeight, toolbarDockHeight, pagerPagePadding])

  const resetTextAdjust = () => {
    setFontSizeNav(null)
    setTextAdjustField(null)
  }

  const resetTemplateNav = () => {
    setTemplateNav(null)
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setDocument((current) => {
        if (!current.blocks.length) {
          return {
            ...current,
            blocks: [{ id: crypto.randomUUID(), kind: 'markdown', text }],
          }
        }
        const firstMarkdown = current.blocks.find((block) => block.kind === 'markdown')
        if (!firstMarkdown || firstMarkdown.kind !== 'markdown') {
          return {
            ...current,
            blocks: [{ id: crypto.randomUUID(), kind: 'markdown', text }, ...current.blocks],
          }
        }
        return updateContentBlock(current, firstMarkdown.id, (block) =>
          block.kind === 'markdown' ? { ...block, text } : block,
        )
      })
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

  const handleSelectStrip = (strip: ToolbarStrip) => {
    setEditorOpen(false)
    setConfigPanel(null)
    resetTextAdjust()
    if (strip === 'template') {
      setToolbarStrip((current) => {
        if (current === 'template') {
          resetTemplateNav()
          return null
        }
        resetTemplateNav()
        return 'template'
      })
      return
    }
    resetTemplateNav()
    setToolbarStrip((current) => (current === strip ? null : strip))
  }

  const handleSelectPanel = (panel: GraphicConfigPanel) => {
    setEditorOpen(false)
    setToolbarStrip(null)
    resetTemplateNav()
    resetTextAdjust()
    setConfigPanel((current) => (current === panel ? null : panel))
  }

  const handleOpenTextAdjustMenu = () => {
    setEditorOpen(false)
    setConfigPanel(null)
    setToolbarStrip(null)
    resetTemplateNav()
    setTextAdjustField(null)
    setFontSizeNav((current) => {
      if (current === null) return 'menu'
      if (current === 'menu') return null
      return current
    })
  }

  const handleTextAdjustBack = () => {
    if (textAdjustField) {
      setTextAdjustField(null)
      return
    }
    if (isTextAdjustTarget(fontSizeNav)) {
      setFontSizeNav('menu')
      return
    }
    resetTextAdjust()
  }

  const handleTemplateBack = () => {
    if (templateNav) {
      setTemplateNav(null)
      return
    }
    setToolbarStrip(null)
  }

  const handlePickReferenceImage = () => {
    setConfig((current) => ({ ...current, backgroundType: 'reference' }))
    templateRefInputRef.current?.click()
  }

  const handleSelectTemplateSolid = () => {
    setConfig((current) => ({ ...current, backgroundType: 'solid' }))
    setTemplateNav((current) => (current === 'solid' ? null : 'solid'))
  }

  const handleSelectTemplateTexture = () => {
    setTemplateNav((current) => (current === 'texture' ? null : 'texture'))
  }

  const handleSelectTextAdjustTarget = (target: FontSizeTarget) => {
    setTextAdjustField(null)
    setFontSizeNav((current) => (current === target ? 'menu' : target))
  }

  const handleSelectTextAdjustField = (field: TextAdjustField) => {
    setTextAdjustField((current) => (current === field ? null : field))
  }

  const handleEdit = () => {
    setConfigPanel('content')
    setToolbarStrip(null)
    resetTemplateNav()
    resetTextAdjust()
    setEditorOpen(false)
    setEditingMarkdownBlockId(null)
  }

  const handleEditMarkdownBlock = (blockId: string) => {
    setEditingMarkdownBlockId(blockId)
    setEditorOpen(true)
  }

  const editingMarkdownBlock =
    editingMarkdownBlockId &&
    document.blocks.find(
      (block): block is Extract<typeof block, { kind: 'markdown' }> =>
        block.id === editingMarkdownBlockId && block.kind === 'markdown',
    )

  const handleToggleSafeArea = () => {
    setConfigPanel(null)
    setToolbarStrip(null)
    resetTemplateNav()
    resetTextAdjust()
    setShowSafeArea((current) => !current)
  }

  const handleFontSelect = (font: FontOption) => {
    if (!isTextAdjustTarget(fontSizeNav)) return

    const updates =
      fontSizeNav === 'title'
        ? { titleFontId: font.id, titleFontFamily: font.fontFamily }
        : fontSizeNav === 'heading'
          ? { headingFontId: font.id, headingFontFamily: font.fontFamily }
          : fontSizeNav === 'code'
            ? { codeFontId: font.id, codeFontFamily: font.fontFamily }
            : { bodyFontId: font.id, bodyFontFamily: font.fontFamily }

    setConfig((current) => ({ ...current, ...updates }))
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
    resetTemplateNav()
    resetTextAdjust()
    setEditorOpen(false)
    setSaveSheetOpen(true)
  }

  const showTextAdjustStrip =
    textAdjustField !== null && isTextAdjustTarget(fontSizeNav)

  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-neutral-100"
      style={
        sheetOpen
          ? {
              paddingBottom: `calc(${sheetHeight}px + env(safe-area-inset-bottom, 0px))`,
            }
          : undefined
      }
    >
      <div
        ref={pagerRef}
        className="graphic-pager relative z-0 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        {pages.map((page) => (
          <div
            key={page.index}
            className={
              sheetOpen
                ? 'flex h-full w-full shrink-0 snap-center items-end justify-center px-4 pt-4 pb-2'
                : 'flex h-full w-full shrink-0 snap-center items-center justify-center p-4'
            }
          >
            <GraphicPage
              page={page}
              config={previewConfig}
              markdown={markdown}
              displayWidth={pagerPageSize?.width}
              showSafeArea={showSafeArea}
              className="rounded-xl shadow-lg"
            />
          </div>
        ))}
      </div>

      {configPanel === 'highlight' && (
        <GraphicTextConfigSheet
          isOpen={configPanel === 'highlight'}
          panel={configPanel}
          config={config}
          markdown={markdown}
          document={document}
          sheetHeight={sheetHeight}
          toolbarDockHeight={toolbarDockHeight}
          highlightDraft={highlightPreview}
          onOpenChange={(open) => {
            if (!open) setConfigPanel(null)
          }}
          onUpdate={(updates) => setConfig((current) => ({ ...current, ...updates }))}
          onHeightChange={setSheetHeight}
          onHighlightDraftChange={setHighlightPreview}
        />
      )}

      {configPanel === 'content' && (
        <GraphicContentSheet
          isOpen={configPanel === 'content'}
          document={document}
          config={config}
          sheetHeight={sheetHeight}
          toolbarDockHeight={toolbarDockHeight}
          selectedBlockId={selectedContentBlockId}
          onOpenChange={(open) => {
            if (!open) setConfigPanel(null)
          }}
          onHeightChange={setSheetHeight}
          onDocumentChange={setDocument}
          onSelectBlock={setSelectedContentBlockId}
          onEditMarkdownBlock={handleEditMarkdownBlock}
        />
      )}

      <div ref={toolbarDockRef} className="relative z-20 shrink-0">
        <input
          ref={templateRefInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) handleBackgroundUpload(file)
            event.target.value = ''
          }}
        />

        {!configPanel && showTextAdjustStrip && (
          <GraphicTextAdjustFieldStrip
            target={fontSizeNav}
            field={textAdjustField}
            config={config}
            onUpdate={(updates) => setConfig((current) => ({ ...current, ...updates }))}
            onFontSelect={handleFontSelect}
          />
        )}
        {!configPanel && toolbarStrip === 'aspect' && (
          <GraphicAspectStrip selected={config.aspectRatio} onSelect={handleAspectSelect} />
        )}
        {!configPanel && toolbarStrip === 'template' && templateNav === 'solid' && (
          <GraphicTemplateSolidStrip
            config={config}
            onUpdate={(updates) => setConfig((current) => ({ ...current, ...updates }))}
          />
        )}
        {!configPanel && toolbarStrip === 'template' && templateNav === 'texture' && (
          <GraphicTemplateTextureStrip
            config={config}
            onUpdate={(updates) => setConfig((current) => ({ ...current, ...updates }))}
          />
        )}
        {!configPanel && toolbarStrip === 'top-text' && (
          <GraphicTopTextStrip
            value={config.topText}
            onChange={(topText) => setConfig((current) => ({ ...current, topText }))}
          />
        )}

        {!configPanel && (
          <GraphicTextToolbar
            activePanel={configPanel}
            activeStrip={toolbarStrip}
            fontSizeNav={fontSizeNav}
            textAdjustField={textAdjustField}
            templateNav={templateNav}
            config={config}
            editorOpen={editorOpen || editingMarkdownBlockId !== null}
            safeAreaOpen={showSafeArea}
            saveDisabled={pages.length === 0}
            onEdit={handleEdit}
            onSelectStrip={handleSelectStrip}
            onSelectPanel={handleSelectPanel}
            onOpenTextAdjustMenu={handleOpenTextAdjustMenu}
            onTextAdjustBack={handleTextAdjustBack}
            onSelectTextAdjustTarget={handleSelectTextAdjustTarget}
            onSelectTextAdjustField={handleSelectTextAdjustField}
            onTemplateBack={handleTemplateBack}
            onPickReferenceImage={handlePickReferenceImage}
            onSelectTemplateSolid={handleSelectTemplateSolid}
            onSelectTemplateTexture={handleSelectTemplateTexture}
            onToggleSafeArea={handleToggleSafeArea}
            onSave={handleSave}
          />
        )}
      </div>

      {editorOpen && editingMarkdownBlock && (
        <MarkdownEditorDock
          value={editingMarkdownBlock.text}
          onChange={(text) =>
            setDocument((current) =>
              updateContentBlock(current, editingMarkdownBlock.id, (block) =>
                block.kind === 'markdown' ? { ...block, text } : block,
              ),
            )
          }
          onPaste={handlePaste}
          pasteError={pasteError}
          onCommit={() => {
            setEditorOpen(false)
            setEditingMarkdownBlockId(null)
          }}
          onDismiss={() => {
            setEditorOpen(false)
            setEditingMarkdownBlockId(null)
          }}
          title="编辑段落"
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
