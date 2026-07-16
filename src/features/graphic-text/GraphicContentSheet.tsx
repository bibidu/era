import {
  ChevronDown,
  ChevronUp,
  Code2,
  Heading1,
  Heading2,
  ImagePlus,
  Pilcrow,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildContentBlockPageMap } from './contentBlockPages'
import {
  addAsset,
  createImageContentBlock,
  describeContentBlock,
  insertContentBlock,
  moveContentBlock,
  removeContentBlock,
  updateContentBlock,
  type ContentBlock,
  type GraphicDocument,
} from './document'
import { fileToGraphicAsset } from './imageAsset'
import { GraphicPageRail, mergePageRailSegments } from './GraphicPageRail'
import { parseMarkdown } from './layout'
import {
  clampSheetHeight,
  readCachedSheetHeight,
  writeCachedSheetHeight,
} from './topBar'
import type { GraphicTextConfig } from './types'

interface GraphicContentSheetProps {
  isOpen: boolean
  document: GraphicDocument
  config: GraphicTextConfig
  sheetHeight: number
  toolbarDockHeight: number
  selectedBlockId: string | null
  onOpenChange: (open: boolean) => void
  onHeightChange: (height: number) => void
  onDocumentChange: (document: GraphicDocument) => void
  onSelectBlock: (blockId: string | null) => void
  onEditMarkdownBlock: (blockId: string) => void
}

function blockIcon(block: ContentBlock) {
  if (block.kind === 'image') return ImagePlus
  const first = parseMarkdown(block.text)[0]
  if (first?.type === 'title') return Heading1
  if (first?.type === 'heading') return Heading2
  if (first?.type === 'code') return Code2
  return Pilcrow
}

export function GraphicContentSheet({
  isOpen,
  document,
  config,
  sheetHeight,
  toolbarDockHeight,
  selectedBlockId,
  onOpenChange,
  onHeightChange,
  onDocumentChange,
  onSelectBlock,
  onEditMarkdownBlock,
}: GraphicContentSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const blockItemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [insertIndex, setInsertIndex] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [pageBarSegments, setPageBarSegments] = useState<
    Array<{ page: number; top: number; height: number }>
  >([])
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const blockPageMap = useMemo(
    () => buildContentBlockPageMap(document, config),
    [document, config],
  )

  useLayoutEffect(() => {
    if (!isOpen) return

    const measure = () => {
      const items = document.blocks
        .map((block) => {
          const element = blockItemRefs.current.get(block.id)
          if (!element) return null
          return {
            page: blockPageMap.get(block.id) ?? 1,
            top: element.offsetTop,
            height: element.offsetHeight,
          }
        })
        .filter((item): item is { page: number; top: number; height: number } => item !== null)

      setPageBarSegments(mergePageRailSegments(items))
    }

    measure()
    const observer = new ResizeObserver(measure)
    blockItemRefs.current.forEach((element) => observer.observe(element))
    if (scrollRef.current) observer.observe(scrollRef.current)

    return () => observer.disconnect()
  }, [isOpen, document.blocks, blockPageMap, selectedBlockId])

  if (!isOpen) return null

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const currentHeight =
      sheetHeight || panelRef.current?.getBoundingClientRect().height || readCachedSheetHeight()
    resizeRef.current = { startY: event.clientY, startHeight: currentHeight }

    const onMove = (moveEvent: PointerEvent) => {
      if (!resizeRef.current) return
      const delta = resizeRef.current.startY - moveEvent.clientY
      const nextHeight = clampSheetHeight(resizeRef.current.startHeight + delta)
      if (panelRef.current) {
        panelRef.current.style.height = `${nextHeight}px`
        panelRef.current.style.maxHeight = `${nextHeight}px`
      }
      onHeightChange(nextHeight)
    }

    const onEnd = () => {
      resizeRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
      writeCachedSheetHeight(sheetHeight)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
  }

  const handleUploadFile = async (file: File, insertAt?: number) => {
    try {
      setUploadError('')
      const asset = await fileToGraphicAsset(file)
      const nextDocument = addAsset(document, asset)
      const imageBlock = createImageContentBlock(asset.id)
      const index = insertAt ?? nextDocument.blocks.length
      onDocumentChange(insertContentBlock(nextDocument, index, imageBlock))
      onSelectBlock(imageBlock.id)
      setInsertIndex(null)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '图片上传失败')
    }
  }

  const openFilePicker = (insertAt?: number) => {
    setInsertIndex(insertAt ?? null)
    fileInputRef.current?.click()
  }

  const setBlockItemRef = (blockId: string, element: HTMLElement | null) => {
    if (element) blockItemRefs.current.set(blockId, element)
    else blockItemRefs.current.delete(blockId)
  }

  return (
    <div
      ref={panelRef}
      className="graphic-config-sheet-fixed graphic-config-sheet-inline graphic-config-drawer-dialog graphic-content-sheet"
      style={{
        height: sheetHeight,
        maxHeight: sheetHeight,
        bottom: toolbarDockHeight,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleUploadFile(file, insertIndex ?? undefined)
          event.target.value = ''
        }}
      />

      <button
        type="button"
        aria-label="关闭"
        className="graphic-sheet-close"
        onClick={() => onOpenChange(false)}
      >
        <X size={18} />
      </button>

      <div
        className="graphic-config-sheet-handle"
        role="separator"
        aria-orientation="horizontal"
        aria-label="调节面板高度"
        onPointerDown={handleResizeStart}
      >
        <span className="graphic-config-sheet-handle-bar" />
      </div>

      <div className="graphic-content-sheet-body">
        {uploadError && <p className="graphic-content-sheet-error">{uploadError}</p>}

        <div ref={scrollRef} className="graphic-content-sheet-scroll">
          <div className="graphic-content-block-list">
            {document.blocks.length === 0 ? (
              <div className="graphic-content-empty">
                <p>还没有内容块</p>
                <button type="button" className="graphic-content-empty-btn" onClick={() => openFilePicker(0)}>
                  插入图片
                </button>
              </div>
            ) : (
              <>
                <InsertGap onInsert={() => openFilePicker(0)} />

                {document.blocks.map((block, index) => {
                  const Icon = blockIcon(block)
                  const meta = describeContentBlock(block, document.assets)
                  const selected = selectedBlockId === block.id
                  return (
                    <div key={block.id}>
                      <div
                        ref={(element) => setBlockItemRef(block.id, element)}
                        className={`graphic-content-block-item ${selected ? 'graphic-content-block-item--selected' : ''}`}
                      >
                        <div className="graphic-content-block-main">
                          <Icon size={18} strokeWidth={1.75} className="shrink-0 text-neutral-500" />
                          {block.kind === 'image' ? (
                            <img
                              src={document.assets[block.assetId]?.url}
                              alt=""
                              className="graphic-content-block-thumb"
                            />
                          ) : null}
                          <button
                            type="button"
                            className="graphic-content-block-text"
                            onClick={() => onSelectBlock(selected ? null : block.id)}
                          >
                            <p className="graphic-content-block-preview">{meta.preview}</p>
                          </button>
                          <div className="graphic-content-block-actions">
                            <button
                              type="button"
                              aria-label="上移"
                              disabled={index === 0}
                              onClick={() => onDocumentChange(moveContentBlock(document, block.id, -1))}
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label="下移"
                              disabled={index === document.blocks.length - 1}
                              onClick={() => onDocumentChange(moveContentBlock(document, block.id, 1))}
                            >
                              <ChevronDown size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label="删除"
                              onClick={() => {
                                onDocumentChange(removeContentBlock(document, block.id))
                                if (selectedBlockId === block.id) onSelectBlock(null)
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {selected && block.kind === 'markdown' && (
                          <div className="graphic-content-block-tools">
                            <button type="button" onClick={() => onEditMarkdownBlock(block.id)}>
                              编辑文字
                            </button>
                          </div>
                        )}

                        {selected && block.kind === 'image' && (
                          <div className="graphic-content-block-tools graphic-content-image-tools">
                            <button
                              type="button"
                              className={block.fit === 'width' ? 'is-active' : ''}
                              onClick={() =>
                                onDocumentChange(
                                  updateContentBlock(document, block.id, (current) =>
                                    current.kind === 'image' ? { ...current, fit: 'width' } : current,
                                  ),
                                )
                              }
                            >
                              撑满
                            </button>
                            <button
                              type="button"
                              className={block.fit === 'contain' ? 'is-active' : ''}
                              onClick={() =>
                                onDocumentChange(
                                  updateContentBlock(document, block.id, (current) =>
                                    current.kind === 'image' ? { ...current, fit: 'contain' } : current,
                                  ),
                                )
                              }
                            >
                              原比例
                            </button>
                          </div>
                        )}
                      </div>

                      <InsertGap onInsert={() => openFilePicker(index + 1)} />
                    </div>
                  )
                })}

                <GraphicPageRail segments={pageBarSegments} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InsertGap({ onInsert }: { onInsert: () => void }) {
  return (
    <div className="graphic-content-insert-gap">
      <button type="button" className="graphic-content-insert-trigger" onClick={onInsert}>
        <Plus size={14} />
        插入图片
      </button>
    </div>
  )
}
