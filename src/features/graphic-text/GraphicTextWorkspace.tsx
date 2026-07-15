import { ArrowLeft, ClipboardPaste, Settings2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MarkdownEditorDock } from '../../components/MarkdownEditorDock'
import { GraphicPage } from './GraphicPage'
import { GraphicTextConfigSheet } from './GraphicTextConfigSheet'
import { exportGraphicPages, saveGraphicPages } from './exportGraphicPages'
import { paginateMarkdown, getGraphicLayout } from './layout'
import { computeWorkspacePagerPageSize } from './graphicPreviewLayout'
import { getFontById } from '../../data/fonts'
import { ensureFontReady } from '../../utils/fontLoad'
import {
  DEFAULT_GRAPHIC_TEXT_CONFIG,
  DEFAULT_MARKDOWN,
  type GraphicTextConfig,
  type GraphicTextPage,
} from './types'

interface GraphicTextWorkspaceProps {
  defaultBackgroundUrl: string | null
}

type GraphicView = 'editor' | 'preview'

export function GraphicTextWorkspace({ defaultBackgroundUrl }: GraphicTextWorkspaceProps) {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN)
  const [config, setConfig] = useState<GraphicTextConfig>(() => ({
    ...DEFAULT_GRAPHIC_TEXT_CONFIG,
    backgroundUrl: defaultBackgroundUrl,
  }))
  const [configOpen, setConfigOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [view, setView] = useState<GraphicView>('editor')
  const [pages, setPages] = useState<GraphicTextPage[]>([])
  const [activePage, setActivePage] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState('')
  const pagerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!defaultBackgroundUrl) return
    setConfig((current) => {
      if (current.template !== 'reference') return current
      return { ...current, backgroundUrl: defaultBackgroundUrl }
    })
  }, [defaultBackgroundUrl])

  useEffect(() => {
    const font = getFontById(config.fontId)
    if (font.source === 'system') return
    void ensureFontReady(font, markdown || font.sample)
  }, [config.fontId, markdown])

  const estimatedPages = useMemo(
    () => paginateMarkdown(markdown, config),
    [markdown, config],
  )

  const pagerPageSize = useMemo(() => {
    const layout = getGraphicLayout(config)
    return computeWorkspacePagerPageSize(layout.aspectRatio)
  }, [config])

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setMarkdown(text)
    } catch {
      setSaveProgress('请允许读取剪贴板后重试')
      window.setTimeout(() => setSaveProgress(''), 2200)
    }
  }

  const handleGenerate = () => {
    const nextPages = paginateMarkdown(markdown, config)
    setPages(nextPages)
    setActivePage(0)
    setView('preview')
    setConfigOpen(true)
  }

  const handleBackgroundUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSaveProgress('请选择图片文件')
      window.setTimeout(() => setSaveProgress(''), 2200)
      return
    }

    const reader = new FileReader()
    reader.onerror = () => {
      setSaveProgress('图片读取失败，请重试')
      window.setTimeout(() => setSaveProgress(''), 2200)
    }
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        setSaveProgress('图片读取失败，请重试')
        window.setTimeout(() => setSaveProgress(''), 2200)
        return
      }
      setConfig((current) => ({
        ...current,
        template: 'reference',
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

  const handleSave = async () => {
    if (!pages.length || saving) return
    setSaving(true)
    setSaveProgress(`正在生成 0/${pages.length}`)
    try {
      const blobs = await exportGraphicPages(pages, config, markdown, (current, total) => {
        setSaveProgress(`正在生成 ${current}/${total}`)
      })
      setSaveProgress('请选择“存储到照片”')
      await saveGraphicPages(blobs)
      setSaveProgress('已完成')
    } catch {
      setSaveProgress('保存失败，请重试')
    } finally {
      setSaving(false)
      window.setTimeout(() => setSaveProgress(''), 2500)
    }
  }

  const configSheet = (
    <GraphicTextConfigSheet
      isOpen={configOpen}
      config={config}
      markdown={markdown}
      onOpenChange={setConfigOpen}
      onUpdate={(updates) => setConfig((current) => ({ ...current, ...updates }))}
      onGenerate={handleGenerate}
      onBackgroundUpload={handleBackgroundUpload}
    />
  )

  if (view === 'preview') {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-neutral-100">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3">
          <button
            type="button"
            aria-label="返回编辑"
            className="flex size-9 items-center justify-center rounded-full active:bg-neutral-100"
            onClick={() => setView('editor')}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium">图文预览</p>
            <p className="text-[11px] text-neutral-500">
              {activePage + 1} / {pages.length}
            </p>
          </div>
          <button
            type="button"
            aria-label="配置"
            className="flex size-9 items-center justify-center rounded-full active:bg-neutral-100"
            onClick={() => setConfigOpen(true)}
          >
            <Settings2 size={18} />
          </button>
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

        <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
          {saveProgress && (
            <p className="mb-2 text-center text-xs text-neutral-500">{saveProgress}</p>
          )}
          <button
            type="button"
            disabled={saving}
            className="h-12 w-full rounded-xl bg-black text-sm font-semibold text-white disabled:opacity-50"
            onClick={handleSave}
          >
            {saving ? saveProgress || '生成中...' : `保存 ${pages.length} 张到本地`}
          </button>
        </div>

        {configSheet}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2">
        <div>
          <p className="text-sm font-medium text-neutral-900">Markdown 内容</p>
          <p className="text-xs text-neutral-500">预计生成 {estimatedPages.length} 页</p>
        </div>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50"
          onClick={() => setConfigOpen(true)}
          aria-label="打开配置"
        >
          <Settings2 size={17} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <button
          type="button"
          onClick={() => setEditorOpen(true)}
          className="h-[50vh] w-full overflow-hidden rounded-2xl border border-neutral-300 bg-neutral-50 p-4 text-left font-mono text-base leading-7 text-neutral-900 outline-none active:border-neutral-500"
          style={{ fontSize: '16px', WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          {markdown ? (
            <span className="line-clamp-[18] whitespace-pre-wrap">{markdown}</span>
          ) : (
            <span className="text-neutral-400">
              {'# 输入标题\n\n正文内容支持 Markdown 语法'}
            </span>
          )}
        </button>
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
        {saveProgress && (
          <p className="mb-2 text-center text-xs text-red-500">{saveProgress}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white text-sm font-medium active:bg-neutral-100"
            onClick={handlePaste}
          >
            <ClipboardPaste size={18} />
            粘贴
          </button>
          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-black text-sm font-semibold text-white active:bg-neutral-800"
            onClick={handleGenerate}
          >
            <Sparkles size={18} />
            生成
          </button>
        </div>
      </div>

      {editorOpen && (
        <MarkdownEditorDock
          value={markdown}
          onChange={setMarkdown}
          onCommit={() => setEditorOpen(false)}
          onDismiss={() => setEditorOpen(false)}
        />
      )}

      {configSheet}
    </div>
  )
}
