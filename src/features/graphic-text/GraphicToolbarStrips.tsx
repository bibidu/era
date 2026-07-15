import { useRef } from 'react'
import { FONT_OPTIONS, type FontOption } from '../../data/fonts'
import { GraphicConfigSelect } from './GraphicConfigSelect'
import {
  BODY_FONT_SIZE_OPTIONS,
  BODY_LINE_HEIGHT_OPTIONS,
  HEADING_FONT_SIZE_OPTIONS,
  HEADING_MARGIN_OPTIONS,
  TITLE_FONT_SIZE_OPTIONS,
  TITLE_LINE_HEIGHT_OPTIONS,
  TITLE_MARGIN_OPTIONS,
} from './configSelectOptions'
import type { FontSizeTarget, TextAdjustField } from './graphicConfigPanels'
import { PAPER_COLORS, TemplatePreviewSquare } from './graphicTemplateOptions'
import { PixelPreviewArt } from './PixelPreviewArt'
import { GRAPHIC_ASPECT_RATIO_OPTIONS, type GraphicAspectRatio, type GraphicTextConfig } from './types'

function StripShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="graphic-toolbar-strip">
      <div className="graphic-toolbar-strip-scroll component-scroll-row flex gap-2">
        {children}
      </div>
    </div>
  )
}

interface GraphicTopTextStripProps {
  value: string
  onChange: (value: string) => void
}

export function GraphicTopTextStrip({ value, onChange }: GraphicTopTextStripProps) {
  return (
    <StripShell>
      <label className="graphic-toolbar-strip-top-text flex min-w-0 flex-1 items-center gap-2 text-sm">
        <span className="shrink-0 text-neutral-600">顶部文案</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="留空则显示「全文 xxx 字」"
          className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-2 text-sm outline-none focus:border-neutral-500"
        />
      </label>
    </StripShell>
  )
}

interface GraphicFontStripProps {
  selectedFontId: string
  onSelect: (font: FontOption) => void
}

export function GraphicFontStrip({ selectedFontId, onSelect }: GraphicFontStripProps) {
  return (
    <StripShell>
      {FONT_OPTIONS.map((font) => {
        const selected = selectedFontId === font.id
        return (
          <button
            key={font.id}
            type="button"
            className={`graphic-toolbar-strip-chip ${selected ? 'graphic-toolbar-strip-chip--selected' : ''}`}
            style={{ fontFamily: font.fontFamily }}
            onClick={() => onSelect(font)}
          >
            {font.label}
          </button>
        )
      })}
    </StripShell>
  )
}

function parseAspectNumbers(id: string) {
  const [width, height] = id.split(':').map(Number)
  return { width, height }
}

function aspectPreviewSize(id: string, maxDim = 20) {
  const { width, height } = parseAspectNumbers(id)
  const scale = maxDim / Math.max(width, height)
  return { width: width * scale, height: height * scale }
}

interface GraphicAspectStripProps {
  selected: GraphicAspectRatio
  onSelect: (ratio: GraphicAspectRatio) => void
}

export function GraphicAspectStrip({ selected, onSelect }: GraphicAspectStripProps) {
  return (
    <StripShell>
      {GRAPHIC_ASPECT_RATIO_OPTIONS.map((option) => {
        const preview = aspectPreviewSize(option.id)
        const isSelected = selected === option.id
        return (
          <button
            key={option.id}
            type="button"
            aria-label={`图片比例 ${option.label}`}
            className={`graphic-toolbar-strip-ratio ${isSelected ? 'graphic-toolbar-strip-ratio--selected' : ''}`}
            onClick={() => onSelect(option.id)}
          >
            <span
              className={`graphic-toolbar-strip-ratio-frame ${isSelected ? 'graphic-toolbar-strip-ratio-frame--selected' : ''}`}
              style={{ width: preview.width + 8, height: preview.height + 8 }}
            >
              <span
                className={`graphic-toolbar-strip-ratio-inner ${isSelected ? 'graphic-toolbar-strip-ratio-inner--selected' : ''}`}
                style={{ width: preview.width, height: preview.height }}
              />
            </span>
            <span className="graphic-toolbar-strip-ratio-label">{option.label}</span>
          </button>
        )
      })}
    </StripShell>
  )
}

interface GraphicTemplateStripProps {
  config: GraphicTextConfig
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
  onBackgroundUpload: (file: File) => void
}

export function GraphicTemplateStrip({
  config,
  onUpdate,
  onBackgroundUpload,
}: GraphicTemplateStripProps) {
  const referenceInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <StripShell>
      <input
        ref={referenceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onBackgroundUpload(file)
          event.target.value = ''
        }}
      />

      <button
        type="button"
        aria-label="参考图"
        className="graphic-toolbar-strip-template-btn"
        onClick={() => {
          onUpdate({ backgroundType: 'reference' })
          referenceInputRef.current?.click()
        }}
      >
        <TemplatePreviewSquare selected={config.backgroundType === 'reference'}>
          {config.backgroundUrl ? (
            <img src={config.backgroundUrl} alt="" className="size-full object-cover" />
          ) : null}
        </TemplatePreviewSquare>
        <span>参考图</span>
      </button>

      <button
        type="button"
        aria-label="纯色纸张"
        className="graphic-toolbar-strip-template-btn"
        onClick={() => onUpdate({ backgroundType: 'solid' })}
      >
        <TemplatePreviewSquare selected={config.backgroundType === 'solid'}>
          <span className="size-full" style={{ backgroundColor: config.paperColor }} aria-hidden />
        </TemplatePreviewSquare>
        <span>纯色</span>
      </button>

      {PAPER_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`纸张色 ${color}`}
          className={`graphic-toolbar-strip-color ${
            config.backgroundType === 'solid' && config.paperColor === color
              ? 'graphic-toolbar-strip-color--selected'
              : ''
          }`}
          style={{ backgroundColor: color }}
          onClick={() => onUpdate({ backgroundType: 'solid', paperColor: color })}
        />
      ))}

      <button
        type="button"
        aria-label="方格块"
        aria-pressed={config.pageOverlay === 'grid'}
        className="graphic-toolbar-strip-template-btn"
        onClick={() =>
          onUpdate({
            pageOverlay: config.pageOverlay === 'grid' ? 'none' : 'grid',
          })
        }
      >
        <TemplatePreviewSquare
          className="graphic-grid-preview"
          selected={config.pageOverlay === 'grid'}
        />
        <span>方格</span>
      </button>

      <button
        type="button"
        aria-label="像素边框"
        aria-pressed={config.pageOverlay === 'pixel'}
        className="graphic-toolbar-strip-template-btn"
        onClick={() =>
          onUpdate({
            pageOverlay: config.pageOverlay === 'pixel' ? 'none' : 'pixel',
          })
        }
      >
        <TemplatePreviewSquare selected={config.pageOverlay === 'pixel'}>
          <PixelPreviewArt />
        </TemplatePreviewSquare>
        <span>像素</span>
      </button>
    </StripShell>
  )
}

interface GraphicTextAdjustFieldStripProps {
  target: FontSizeTarget
  field: TextAdjustField
  config: GraphicTextConfig
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
}

function TextAdjustFieldControl({
  target,
  field,
  config,
  onUpdate,
}: GraphicTextAdjustFieldStripProps) {
  if (target === 'title') {
    if (field === 'fontSize') {
      return (
        <GraphicConfigSelect
          label="标题字号"
          hideLabel
          className="graphic-toolbar-strip-select graphic-toolbar-strip-select--solo"
          value={config.titleFontSize}
          options={TITLE_FONT_SIZE_OPTIONS}
          onChange={(value) => onUpdate({ titleFontSize: value })}
          format={(value) => `${value}px`}
        />
      )
    }
    if (field === 'lineHeight') {
      return (
        <GraphicConfigSelect
          label="标题行高"
          hideLabel
          className="graphic-toolbar-strip-select graphic-toolbar-strip-select--solo w-full"
          value={config.titleLineHeight}
          options={TITLE_LINE_HEIGHT_OPTIONS}
          onChange={(value) => onUpdate({ titleLineHeight: value })}
        />
      )
    }
    if (field === 'marginTop') {
      return (
        <GraphicConfigSelect
          label="上间距"
          hideLabel
          className="graphic-toolbar-strip-select graphic-toolbar-strip-select--solo w-full"
          value={config.titleMarginTop}
          options={TITLE_MARGIN_OPTIONS}
          onChange={(value) => onUpdate({ titleMarginTop: value })}
        />
      )
    }
    return (
      <GraphicConfigSelect
        label="下间距"
        hideLabel
        className="graphic-toolbar-strip-select graphic-toolbar-strip-select--solo w-full"
        value={config.titleMarginBottom}
        options={TITLE_MARGIN_OPTIONS}
        onChange={(value) => onUpdate({ titleMarginBottom: value })}
      />
    )
  }

  if (target === 'heading') {
    if (field === 'fontSize') {
      return (
        <GraphicConfigSelect
          label="二级字号"
          hideLabel
          className="graphic-toolbar-strip-select graphic-toolbar-strip-select--solo w-full"
          value={config.headingFontSize}
          options={HEADING_FONT_SIZE_OPTIONS}
          onChange={(value) => onUpdate({ headingFontSize: value })}
          format={(value) => `${value}px`}
        />
      )
    }
    if (field === 'marginTop') {
      return (
        <GraphicConfigSelect
          label="上间距"
          hideLabel
          className="graphic-toolbar-strip-select graphic-toolbar-strip-select--solo w-full"
          value={config.headingMarginTop}
          options={HEADING_MARGIN_OPTIONS}
          onChange={(value) => onUpdate({ headingMarginTop: value })}
        />
      )
    }
    return (
      <GraphicConfigSelect
        label="下间距"
        hideLabel
        className="graphic-toolbar-strip-select graphic-toolbar-strip-select--solo w-full"
        value={config.headingMarginBottom}
        options={HEADING_MARGIN_OPTIONS}
        onChange={(value) => onUpdate({ headingMarginBottom: value })}
      />
    )
  }

  if (field === 'fontSize') {
    return (
      <GraphicConfigSelect
        label="正文字号"
        hideLabel
        className="graphic-toolbar-strip-select graphic-toolbar-strip-select--solo w-full"
        value={config.bodyFontSize}
        options={BODY_FONT_SIZE_OPTIONS}
        onChange={(value) => onUpdate({ bodyFontSize: value })}
        format={(value) => `${value}px`}
      />
    )
  }

  return (
    <GraphicConfigSelect
      label="正文行高"
      hideLabel
      className="graphic-toolbar-strip-select graphic-toolbar-strip-select--solo w-full"
      value={config.bodyLineHeight}
      options={BODY_LINE_HEIGHT_OPTIONS}
      onChange={(value) => onUpdate({ bodyLineHeight: value })}
    />
  )
}

export function GraphicTextAdjustFieldStrip(props: GraphicTextAdjustFieldStripProps) {
  return (
    <StripShell>
      <TextAdjustFieldControl {...props} />
    </StripShell>
  )
}

/** @deprecated use GraphicTextAdjustFieldStrip */
export function GraphicFontSizeDetailStrip({
  target,
  config,
  onUpdate,
}: {
  target: FontSizeTarget
  config: GraphicTextConfig
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
}) {
  const field = target === 'body' ? 'fontSize' : 'fontSize'
  return <GraphicTextAdjustFieldStrip target={target} field={field} config={config} onUpdate={onUpdate} />
}
