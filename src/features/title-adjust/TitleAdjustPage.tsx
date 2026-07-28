import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, RotateCcw } from 'lucide-react'
import { TEXT_FONT_OPTIONS, getFontById } from '../../data/fonts'
import { ensureFontReady } from '../../utils/fontLoad'
import {
  DEFAULT_CHAR,
  buildLinesFromText,
  formatTitleAdjustClipboard,
  type TitleAdjustCharConfig,
  type TitleAdjustConfig,
  type TitleAdjustLineConfig,
  TITLE_ADJUST_CLIPBOARD_TYPE,
  TITLE_ADJUST_CLIPBOARD_VERSION,
} from './titleAdjustModel'

const PRESET_TITLE = '买房租房选楼层\n99%的人都选错了\n「上篇」'
const PREVIEW_WIDTH = 360

type CharRef = { lineIndex: number; charIndex: number }

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-xs" style={{ color: 'var(--era-muted)' }}>
        <span>{label}</span>
        <span className="font-mono tabular-nums" style={{ color: 'var(--era-fg)' }}>
          {Number.isInteger(step) ? value : value.toFixed(2)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-neutral-800"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min, min, max))}
        className="h-8 rounded-lg border px-2 font-mono text-sm"
        style={{
          borderColor: 'var(--era-border)',
          background: 'var(--era-panel)',
          color: 'var(--era-fg)',
        }}
      />
    </label>
  )
}

function TitlePreview({
  lines,
  lineGapEm,
  selected,
  onSelect,
}: {
  lines: TitleAdjustLineConfig[]
  lineGapEm: number
  selected: CharRef | null
  onSelect: (ref: CharRef) => void
}) {
  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-2xl border"
      style={{
        borderColor: 'var(--era-border)',
        background: '#F3F0E8',
        aspectRatio: '9 / 16',
        maxHeight: 'min(58vh, 520px)',
      }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at 50% 80%, rgba(120,150,180,0.35), transparent 60%)',
        }}
      />
      <div className="relative flex h-full flex-col px-[8%] pt-[14%]">
        <div className="mb-3 text-center text-[10px] tracking-wide text-neutral-400">
          连续观看、点赞、关注，你也会是地理风水达人(阳宅篇)
        </div>
        <div className="mx-auto mb-4 h-px w-full bg-neutral-300/70" />
        <div className="flex flex-col items-center">
          {lines.map((line, lineIndex) => {
            const maxSize = Math.max(...line.chars.map((c) => c.fontSize), 1)
            return (
              <div
                key={lineIndex}
                className="flex flex-wrap items-end justify-center"
                style={{
                  marginBottom: lineIndex < lines.length - 1 ? `${lineGapEm * maxSize}px` : 0,
                }}
              >
                {line.chars.map((char, charIndex) => {
                  const active =
                    selected?.lineIndex === lineIndex && selected?.charIndex === charIndex
                  return (
                    <button
                      key={`${lineIndex}-${charIndex}`}
                      type="button"
                      onClick={() => onSelect({ lineIndex, charIndex })}
                      className="relative shrink-0 border border-transparent"
                      style={{
                        width: `${char.widthEm * char.fontSize}px`,
                        height: `${char.fontSize * Math.max(char.scaleY, 1)}px`,
                        outline: active ? '2px solid #EF4444' : undefined,
                        outlineOffset: 2,
                      }}
                      title={`「${char.ch}」点选编辑`}
                    >
                      <span
                        className="absolute inset-0 flex items-center justify-center font-bold leading-none"
                        style={{
                          fontFamily: char.fontFamily,
                          fontSize: `${char.fontSize}px`,
                          color: char.color,
                          transform: `scale(${char.scaleX}, ${char.scaleY})`,
                          transformOrigin: 'center center',
                        }}
                      >
                        {char.ch === ' ' ? '\u00a0' : char.ch}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function TitleAdjustPage() {
  const [sourceText, setSourceText] = useState(PRESET_TITLE)
  const [lines, setLines] = useState<TitleAdjustLineConfig[]>(() => buildLinesFromText(PRESET_TITLE))
  const [lineGapEm, setLineGapEm] = useState(0.28)
  const [selected, setSelected] = useState<CharRef | null>({ lineIndex: 0, charIndex: 0 })
  const [copied, setCopied] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [batchSelected, setBatchSelected] = useState<string[]>([])

  const selectedChar: TitleAdjustCharConfig | null = useMemo(() => {
    if (!selected) return null
    return lines[selected.lineIndex]?.chars[selected.charIndex] ?? null
  }, [lines, selected])

  useEffect(() => {
    const ids = new Set<string>()
    for (const line of lines) {
      for (const ch of line.chars) ids.add(ch.fontId)
    }
    void Promise.all(
      [...ids].map(async (id) => {
        const font = getFontById(id)
        if (font.source !== 'system') await ensureFontReady(font, font.sample)
      }),
    )
  }, [lines])

  const rebuildFromText = () => {
    const next = buildLinesFromText(sourceText)
    setLines(next)
    setSelected(next[0]?.chars.length ? { lineIndex: 0, charIndex: 0 } : null)
    setBatchSelected([])
  }

  const updateSelected = (patch: Partial<TitleAdjustCharConfig>) => {
    if (!selected) return
    setLines((prev) =>
      prev.map((line, li) => {
        if (li !== selected.lineIndex) return line
        return {
          chars: line.chars.map((ch, ci) =>
            ci === selected.charIndex ? { ...ch, ...patch } : ch,
          ),
        }
      }),
    )
  }

  const applyPatchToBatchOrSelected = (patch: Partial<TitleAdjustCharConfig>) => {
    if (batchMode && batchSelected.length) {
      const keys = new Set(batchSelected)
      setLines((prev) =>
        prev.map((line, li) => ({
          chars: line.chars.map((ch, ci) =>
            keys.has(`${li}:${ci}`) ? { ...ch, ...patch } : ch,
          ),
        })),
      )
      return
    }
    updateSelected(patch)
  }

  const toggleBatchKey = (ref: CharRef) => {
    const key = `${ref.lineIndex}:${ref.charIndex}`
    setBatchSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
    setSelected(ref)
  }

  const buildConfig = (): TitleAdjustConfig => ({
    type: TITLE_ADJUST_CLIPBOARD_TYPE,
    version: TITLE_ADJUST_CLIPBOARD_VERSION,
    lineGapEm,
    baseWidth: PREVIEW_WIDTH,
    lines,
  })

  const copyConfig = async () => {
    const text = formatTitleAdjustClipboard(buildConfig())
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const resetSelected = () => {
    if (!selectedChar) return
    applyPatchToBatchOrSelected({
      ...DEFAULT_CHAR,
      ch: selectedChar.ch,
      color: selectedChar.color,
    })
  }

  const applyPresetEmphasis = () => {
    // 快捷：买房租房 + 错 → 数黑体拉伸
    setLines((prev) => {
      const next = prev.map((line) => ({
        chars: line.chars.map((c) => ({ ...c })),
      }))
      const flat: { li: number; ci: number; ch: string }[] = []
      next.forEach((line, li) =>
        line.chars.forEach((c, ci) => flat.push({ li, ci, ch: c.ch })),
      )
      const title = flat.map((f) => f.ch).join('')
      const buy = title.indexOf('买房租房')
      const cuo = title.indexOf('错')
      const mark = (abs: number) => {
        let n = 0
        for (const f of flat) {
          if (n === abs) {
            next[f.li].chars[f.ci] = {
              ...next[f.li].chars[f.ci],
              fontId: 'shuheiti',
              fontFamily: '"Alimama ShuHeiTi", sans-serif',
              scaleX: 0.7,
              scaleY: 1.65,
              widthEm: 0.95,
            }
            return
          }
          n += 1
        }
      }
      if (buy >= 0) for (let i = 0; i < 4; i++) mark(buy + i)
      if (cuo >= 0) {
        mark(cuo)
        // 错保持红色
        let n = 0
        for (const f of flat) {
          if (n === cuo) {
            next[f.li].chars[f.ci].color = '#EF4444'
            break
          }
          n += 1
        }
      }
      // 选楼层红色
      const xuan = title.indexOf('选楼层')
      if (xuan >= 0) {
        let n = 0
        for (const f of flat) {
          if (n >= xuan && n < xuan + 3) next[f.li].chars[f.ci].color = '#EF4444'
          n += 1
        }
      }
      return next
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-28">
        <div className="mb-3">
          <h2 className="text-base font-semibold">标题调整</h2>
          <p className="mt-1 text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
            逐字调字体 / 占位宽 / XY 拉伸 / 字号 / 颜色，调好后点「复制配置」发给 AI 出图。
          </p>
        </div>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-xs" style={{ color: 'var(--era-muted)' }}>
            标题原文（换行或 | 分行）
          </span>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={3}
            className="w-full rounded-xl border px-3 py-2 text-sm leading-6"
            style={{
              borderColor: 'var(--era-border)',
              background: 'var(--era-panel)',
              color: 'var(--era-fg)',
            }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={rebuildFromText}
              className="h-8 rounded-lg border px-3 text-xs font-medium"
              style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
            >
              重新生成字表
            </button>
            <button
              type="button"
              onClick={applyPresetEmphasis}
              className="h-8 rounded-lg border px-3 text-xs font-medium"
              style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
            >
              套用数黑拉伸预设
            </button>
          </div>
        </label>

        <TitlePreview
          lines={lines}
          lineGapEm={lineGapEm}
          selected={selected}
          onSelect={(ref) => {
            if (batchMode) toggleBatchKey(ref)
            else setSelected(ref)
          }}
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--era-muted)' }}>
            <input
              type="checkbox"
              checked={batchMode}
              onChange={(e) => {
                setBatchMode(e.target.checked)
                if (!e.target.checked) setBatchSelected([])
              }}
            />
            多选批量改（点预览中的字加入）
          </label>
          {batchMode && (
            <span className="text-xs tabular-nums" style={{ color: 'var(--era-muted)' }}>
              已选 {batchSelected.length}
            </span>
          )}
        </div>

        <div
          className="mt-3 overflow-x-auto rounded-xl border p-2"
          style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
        >
          <div className="flex min-w-max gap-1.5">
            {lines.map((line, li) => (
              <div key={li} className="flex gap-1 border-r pr-2 last:border-r-0" style={{ borderColor: 'var(--era-border)' }}>
                {line.chars.map((ch, ci) => {
                  const key = `${li}:${ci}`
                  const active =
                    selected?.lineIndex === li && selected?.charIndex === ci
                  const batched = batchSelected.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        batchMode
                          ? toggleBatchKey({ lineIndex: li, charIndex: ci })
                          : setSelected({ lineIndex: li, charIndex: ci })
                      }
                      className="flex size-9 items-center justify-center rounded-lg text-sm font-bold"
                      style={{
                        background: active || batched ? '#FEE2E2' : 'var(--era-bg)',
                        color: ch.color,
                        outline: active ? '2px solid #EF4444' : batched ? '1px solid #FCA5A5' : undefined,
                      }}
                    >
                      {ch.ch}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <NumberField
            label="行距 lineGapEm"
            value={lineGapEm}
            min={0}
            max={1.5}
            step={0.02}
            onChange={setLineGapEm}
          />

          {selectedChar ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  当前字：<span className="text-lg">{selectedChar.ch}</span>
                </p>
                <button
                  type="button"
                  onClick={resetSelected}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs"
                  style={{ borderColor: 'var(--era-border)' }}
                >
                  <RotateCcw size={12} />
                  重置该字
                </button>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs" style={{ color: 'var(--era-muted)' }}>
                  字体
                </span>
                <select
                  value={selectedChar.fontId}
                  onChange={(e) => {
                    const font = getFontById(e.target.value)
                    applyPatchToBatchOrSelected({
                      fontId: font.id,
                      fontFamily: font.fontFamily,
                    })
                  }}
                  className="h-9 rounded-lg border px-2 text-sm"
                  style={{
                    borderColor: 'var(--era-border)',
                    background: 'var(--era-panel)',
                    color: 'var(--era-fg)',
                  }}
                >
                  {TEXT_FONT_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>

              <NumberField
                label="字号 fontSize"
                value={selectedChar.fontSize}
                min={20}
                max={96}
                step={1}
                onChange={(v) => applyPatchToBatchOrSelected({ fontSize: v })}
              />
              <NumberField
                label="占位宽 widthEm"
                value={selectedChar.widthEm}
                min={0.3}
                max={2}
                step={0.02}
                onChange={(v) => applyPatchToBatchOrSelected({ widthEm: v })}
              />
              <NumberField
                label="横向拉伸 scaleX"
                value={selectedChar.scaleX}
                min={0.4}
                max={1.6}
                step={0.02}
                onChange={(v) => applyPatchToBatchOrSelected({ scaleX: v })}
              />
              <NumberField
                label="纵向拉伸 scaleY"
                value={selectedChar.scaleY}
                min={0.6}
                max={2.2}
                step={0.02}
                onChange={(v) => applyPatchToBatchOrSelected({ scaleY: v })}
              />

              <label className="flex flex-col gap-1.5">
                <span className="text-xs" style={{ color: 'var(--era-muted)' }}>
                  颜色
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedChar.color}
                    onChange={(e) => applyPatchToBatchOrSelected({ color: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border"
                    style={{ borderColor: 'var(--era-border)' }}
                  />
                  <input
                    type="text"
                    value={selectedChar.color}
                    onChange={(e) => applyPatchToBatchOrSelected({ color: e.target.value })}
                    className="h-9 flex-1 rounded-lg border px-2 font-mono text-sm"
                    style={{
                      borderColor: 'var(--era-border)',
                      background: 'var(--era-panel)',
                      color: 'var(--era-fg)',
                    }}
                  />
                </div>
              </label>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--era-muted)' }}>
              点选预览中的字开始调整
            </p>
          )}
        </div>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-30 border-t px-4 py-3"
        style={{
          borderColor: 'var(--era-border)',
          background: 'var(--era-header)',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          type="button"
          onClick={() => void copyConfig()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: copied ? '#16A34A' : '#111111' }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? '已复制，发给 AI 即可' : '一键复制配置'}
        </button>
      </div>
    </div>
  )
}
