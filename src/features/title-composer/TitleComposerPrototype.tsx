import { useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { TEXT_FONT_OPTIONS } from '../../data/fonts'
import { useFontLoader } from '../../hooks/useFontLoader'
import { TextAdjustNumericControl } from '../graphic-text/TextAdjustNumericControl'
import { BreakPointBar } from './BreakPointBar'
import {
  applyLineColor,
  createDemoDocument,
  documentPlainText,
  mergeWithNext,
  rebuildFromPlainText,
  splitAtGlobalIndex,
  toggleCharColor,
  updateLine,
} from './model'
import { TitlePreview } from './TitlePreview'
import { TitleToolDock } from './TitleToolPanel'
import {
  COLOR_PRESETS,
  FONT_SIZE_OPTIONS,
  GAP_OPTIONS,
  STRETCH_OPTIONS,
  TITLE_ACCENT,
  type TitleDocument,
  type TitleTool,
} from './types'

export function TitleComposerPrototype() {
  const initial = useMemo(() => createDemoDocument(), [])
  const [doc, setDoc] = useState<TitleDocument>(initial)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(
    () => initial.lines[1]?.id ?? initial.lines[0]?.id ?? null,
  )
  const [activeTool, setActiveTool] = useState<TitleTool>('size')
  const [accentColor, setAccentColor] = useState(TITLE_ACCENT)
  const [draftText, setDraftText] = useState(() => documentPlainText(initial))
  const [showTextEdit, setShowTextEdit] = useState(false)
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
    const fontIds = new Set(doc.lines.map((line) => line.fontId))
    for (const id of fontIds) {
      const font = TEXT_FONT_OPTIONS.find((item) => item.id === id)
      if (font) void loadFont(font, '西北绝不能做厨房火烧天门')
    }
  }, [doc.lines, loadFont])

  const resetDemo = () => {
    const next = createDemoDocument()
    setDoc(next)
    setDraftText(documentPlainText(next))
    setSelectedLineId(next.lines[1]?.id ?? next.lines[0]?.id ?? null)
    setActiveTool('size')
  }

  const applyPlainText = () => {
    const next = rebuildFromPlainText(doc, draftText)
    setDoc(next)
    setSelectedLineId(next.lines[0]?.id ?? null)
    setShowTextEdit(false)
  }

  return (
    <div className="title-composer">
      <div className="title-composer__header">
        <div>
          <div className="title-composer__badge">草稿原型</div>
          <h1 className="title-composer__title">标题排版</h1>
          <p className="title-composer__desc">断点条换行 · 选行调字号/拉伸/间距/字体/颜色</p>
        </div>
        <button type="button" className="title-composer__reset" onClick={resetDemo}>
          <RotateCcw size={14} strokeWidth={2} />
          示例
        </button>
      </div>

      <TitlePreview
        doc={doc}
        selectedLineId={selectedLine?.id ?? null}
        activeTool={activeTool}
        accentColor={accentColor}
        onSelectLine={setSelectedLineId}
        onToggleChar={(lineId, charId) => {
          setDoc((prev) => toggleCharColor(prev, lineId, charId, accentColor))
        }}
      />

      <BreakPointBar
        doc={doc}
        selectedLineId={selectedLine?.id ?? null}
        activeTool={activeTool}
        onSelectLine={setSelectedLineId}
        onSplitAt={(globalIndex) => {
          setDoc((prev) => {
            const next = splitAtGlobalIndex(prev, globalIndex)
            setDraftText(documentPlainText(next))
            return next
          })
        }}
        onMergeAt={(lineIndex) => {
          setDoc((prev) => {
            const next = mergeWithNext(prev, lineIndex)
            setDraftText(documentPlainText(next))
            if (next.lines[lineIndex]) setSelectedLineId(next.lines[lineIndex].id)
            return next
          })
        }}
      />

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
                      if (preset.id === 'red') setAccentColor(preset.value)
                    }}
                  />
                ))}
              </div>
              <div className="title-color-row">
                <span className="title-color-label">强调</span>
                {COLOR_PRESETS.filter((p) => p.id !== 'ink').map((preset) => (
                  <button
                    key={`accent-${preset.id}`}
                    type="button"
                    className={`title-color-swatch ${
                      accentColor === preset.value ? 'is-active' : ''
                    }`}
                    style={{ background: preset.value }}
                    aria-label={`强调${preset.label}`}
                    onClick={() => setAccentColor(preset.value)}
                  />
                ))}
                <span className="title-color-note">再点预览里的字</span>
              </div>
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
      </div>
    </div>
  )
}
