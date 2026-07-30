import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, RotateCcw } from 'lucide-react'
import { TEXT_FONT_OPTIONS } from '../../data/fonts'
import { useFontLoader } from '../../hooks/useFontLoader'
import { TextAdjustNumericControl } from '../graphic-text/TextAdjustNumericControl'
import { BreakPointBar } from './BreakPointBar'
import { CharPickerStrip } from './CharPickerStrip'
import {
  applyLineColor,
  createDemoDocument,
  documentPlainText,
  mergeWithNext,
  rebuildFromPlainText,
  splitAtGlobalIndex,
  updateLine,
} from './model'
import { formatTitleConfigForClipboard } from './serializeConfig'
import { TitlePreview } from './TitlePreview'
import { TitleToolDock } from './TitleToolPanel'
import {
  COLOR_PRESETS,
  FONT_SIZE_OPTIONS,
  GAP_OPTIONS,
  STRETCH_OPTIONS,
  type TitleDocument,
  type TitleTool,
} from './types'

export function TitleComposerPrototype() {
  const initial = useMemo(() => createDemoDocument(), [])
  const [doc, setDoc] = useState<TitleDocument>(initial)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(
    () => initial.lines[1]?.id ?? initial.lines[0]?.id ?? null,
  )
  const [selectedCharId, setSelectedCharId] = useState<string | null>(() => {
    const line = initial.lines[0]
    return line?.chars.find((c) => c.color)?.id ?? null
  })
  const [activeTool, setActiveTool] = useState<TitleTool>('size')
  const [draftText, setDraftText] = useState(() => documentPlainText(initial))
  const [showTextEdit, setShowTextEdit] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'fail'>('idle')
  const { loadFont } = useFontLoader()

  const selectedLine = useMemo(
    () => doc.lines.find((line) => line.id === selectedLineId) ?? doc.lines[0] ?? null,
    [doc.lines, selectedLineId],
  )

  useEffect(() => {
    if (!selectedLineId && doc.lines[0]) {
      setSelectedLineId(doc.lines[0].id)
    }
  }, [doc.lines, selectedLineId])

  useEffect(() => {
    if (!selectedCharId || !selectedLine) return
    if (!selectedLine.chars.some((c) => c.id === selectedCharId)) {
      setSelectedCharId(null)
    }
  }, [selectedCharId, selectedLine])

  useEffect(() => {
    const fontIds = new Set(doc.lines.map((line) => line.fontId))
    for (const id of fontIds) {
      const font = TEXT_FONT_OPTIONS.find((item) => item.id === id)
      if (font) void loadFont(font, '西北绝不能做厨房火烧天门')
    }
  }, [doc.lines, loadFont])

  const selectLine = (lineId: string) => {
    setSelectedLineId(lineId)
    if (selectedLineId !== lineId) setSelectedCharId(null)
  }

  const resetDemo = () => {
    const next = createDemoDocument()
    setDoc(next)
    setDraftText(documentPlainText(next))
    setSelectedLineId(next.lines[1]?.id ?? next.lines[0]?.id ?? null)
    setSelectedCharId(next.lines[0]?.chars.find((c) => c.color)?.id ?? null)
    setActiveTool('size')
    setCopyState('idle')
  }

  const applyPlainText = () => {
    const next = rebuildFromPlainText(doc, draftText)
    setDoc(next)
    setSelectedLineId(next.lines[0]?.id ?? null)
    setSelectedCharId(null)
    setShowTextEdit(false)
  }

  const setSelectedCharColor = (color: string | null) => {
    if (!selectedLine || !selectedCharId) return
    setDoc((prev) => ({
      lines: prev.lines.map((line) => {
        if (line.id !== selectedLine.id) return line
        return {
          ...line,
          chars: line.chars.map((c) => {
            if (c.id !== selectedCharId) return c
            return { ...c, color: color ?? undefined }
          }),
        }
      }),
    }))
  }

  const copyConfig = async () => {
    const text = formatTitleConfigForClipboard(doc)
    try {
      await navigator.clipboard.writeText(text)
      setCopyState('done')
    } catch {
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.left = '-9999px'
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        document.body.removeChild(area)
        setCopyState('done')
      } catch {
        setCopyState('fail')
      }
    }
    window.setTimeout(() => setCopyState('idle'), 2000)
  }

  return (
    <div className="title-composer">
      <div className="title-composer__header">
        <div>
          <div className="title-composer__badge">草稿原型</div>
          <h1 className="title-composer__title">标题排版</h1>
          <p className="title-composer__desc">同宽画布 · 选行/选字 · 复制配置给 AI</p>
        </div>
        <button type="button" className="title-composer__reset" onClick={resetDemo}>
          <RotateCcw size={14} strokeWidth={2} />
          示例
        </button>
      </div>

      <TitlePreview
        doc={doc}
        selectedLineId={selectedLine?.id ?? null}
        selectedCharId={selectedCharId}
        activeTool={activeTool}
        onSelectLine={selectLine}
        onSelectChar={(lineId, charId) => {
          setSelectedLineId(lineId)
          setSelectedCharId(charId)
          if (activeTool !== 'color') setActiveTool('color')
        }}
      />

      <BreakPointBar
        doc={doc}
        selectedLineId={selectedLine?.id ?? null}
        activeTool={activeTool}
        onSelectLine={selectLine}
        onSplitAt={(globalIndex) => {
          setDoc((prev) => {
            const next = splitAtGlobalIndex(prev, globalIndex)
            setDraftText(documentPlainText(next))
            return next
          })
          setSelectedCharId(null)
        }}
        onMergeAt={(lineIndex) => {
          setDoc((prev) => {
            const next = mergeWithNext(prev, lineIndex)
            setDraftText(documentPlainText(next))
            if (next.lines[lineIndex]) setSelectedLineId(next.lines[lineIndex].id)
            return next
          })
          setSelectedCharId(null)
        }}
      />

      {selectedLine ? (
        <CharPickerStrip
          line={selectedLine}
          selectedCharId={selectedCharId}
          onSelectChar={(charId) => {
            setSelectedCharId(charId)
            if (charId) setActiveTool('color')
          }}
        />
      ) : null}

      <div className="title-composer__panel">
        <TitleToolDock activeTool={activeTool} onChange={setActiveTool} />

        <div className="title-composer__controls">
          {!selectedLine ? (
            <p className="title-composer__empty">先点选一行</p>
          ) : activeTool === 'break' ? (
            <p className="title-composer__hint">
              当前第 {(doc.lines.findIndex((l) => l.id === selectedLine.id) ?? 0) + 1} 行「
              {selectedLine.chars.map((c) => c.ch).join('')}」· 在上方断点条操作换行
            </p>
          ) : activeTool === 'size' ? (
            <TextAdjustNumericControl
              aria-label="字号"
              value={selectedLine.fontSize}
              options={FONT_SIZE_OPTIONS}
              onChange={(value) =>
                setDoc((prev) => updateLine(prev, selectedLine.id, { fontSize: value }))
              }
              format={(v) => `${v}`}
            />
          ) : activeTool === 'stretch' ? (
            <TextAdjustNumericControl
              aria-label="拉伸"
              value={selectedLine.stretch}
              options={STRETCH_OPTIONS}
              onChange={(value) =>
                setDoc((prev) => updateLine(prev, selectedLine.id, { stretch: value }))
              }
              format={(v) => `${v.toFixed(2)}×`}
            />
          ) : activeTool === 'gap' ? (
            <TextAdjustNumericControl
              aria-label="行距"
              value={selectedLine.gapAfter}
              options={GAP_OPTIONS}
              onChange={(value) =>
                setDoc((prev) => updateLine(prev, selectedLine.id, { gapAfter: value }))
              }
              format={(v) => `${v}`}
            />
          ) : activeTool === 'font' ? (
            <div className="title-font-chips component-scroll-row">
              {TEXT_FONT_OPTIONS.map((font) => {
                const active = selectedLine.fontId === font.id
                return (
                  <button
                    key={font.id}
                    type="button"
                    className={`title-font-chip ${active ? 'is-active' : ''}`}
                    style={{ fontFamily: font.fontFamily }}
                    onClick={() => {
                      void loadFont(font)
                      setDoc((prev) => updateLine(prev, selectedLine.id, { fontId: font.id }))
                    }}
                  >
                    {font.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="title-color-panel">
              {selectedCharId ? (
                <>
                  <div className="title-color-row">
                    <span className="title-color-label">单字</span>
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={`char-${preset.id}`}
                        type="button"
                        className={`title-color-swatch ${
                          selectedLine.chars.find((c) => c.id === selectedCharId)?.color ===
                          preset.value
                            ? 'is-active'
                            : ''
                        }`}
                        style={{ background: preset.value }}
                        aria-label={`单字${preset.label}`}
                        onClick={() => setSelectedCharColor(preset.value)}
                      />
                    ))}
                    <button
                      type="button"
                      className="title-color-clear"
                      onClick={() => setSelectedCharColor(null)}
                    >
                      清除
                    </button>
                  </div>
                  <p className="title-composer__hint">
                    已选「{selectedLine.chars.find((c) => c.id === selectedCharId)?.ch}」·
                    点色块上色，或点清除恢复行色
                  </p>
                </>
              ) : (
                <>
                  <div className="title-color-row">
                    <span className="title-color-label">整行</span>
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`title-color-swatch ${
                          selectedLine.color === preset.value ? 'is-active' : ''
                        }`}
                        style={{ background: preset.value }}
                        aria-label={preset.label}
                        onClick={() => {
                          setDoc((prev) => applyLineColor(prev, selectedLine.id, preset.value))
                        }}
                      />
                    ))}
                  </div>
                  <p className="title-composer__hint">
                    先在「选字」条点一个字，再上色；或点预览里的字直接选中
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="title-composer__footer">
          <button
            type="button"
            className="title-composer__text-toggle"
            onClick={() => {
              setDraftText(documentPlainText(doc))
              setShowTextEdit((v) => !v)
            }}
          >
            {showTextEdit ? '收起文案' : '改文案'}
          </button>
          <span className="title-composer__meta">
            {doc.lines.length} 行 · 选中第{' '}
            {(doc.lines.findIndex((l) => l.id === selectedLine?.id) ?? 0) + 1} 行
            {selectedCharId ? ' · 已选字' : ''}
          </span>
        </div>

        {showTextEdit ? (
          <div className="title-composer__editor">
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={4}
              placeholder={'每行一句标题\n第二行可更大…'}
            />
            <button type="button" className="title-composer__apply" onClick={applyPlainText}>
              应用换行文案
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className={`title-composer__copy ${copyState === 'done' ? 'is-done' : ''} ${
            copyState === 'fail' ? 'is-fail' : ''
          }`}
          onClick={() => void copyConfig()}
        >
          {copyState === 'done' ? (
            <>
              <Check size={16} strokeWidth={2.25} />
              已复制配置
            </>
          ) : copyState === 'fail' ? (
            <>
              <Copy size={16} strokeWidth={2} />
              复制失败，请重试
            </>
          ) : (
            <>
              <Copy size={16} strokeWidth={2} />
              一键复制配置参数
            </>
          )}
        </button>
      </div>
    </div>
  )
}
