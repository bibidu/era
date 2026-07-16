import { getFontOptionsForTarget, type FontOption } from '../../data/fonts'
import {
  BODY_FONT_SIZE_OPTIONS,
  BODY_LINE_HEIGHT_OPTIONS,
  CODE_FONT_SIZE_OPTIONS,
  CODE_LINE_HEIGHT_OPTIONS,
  HEADING_FONT_SIZE_OPTIONS,
  HEADING_MARGIN_OPTIONS,
  TITLE_FONT_SIZE_OPTIONS,
  TITLE_LINE_HEIGHT_OPTIONS,
  TITLE_MARGIN_OPTIONS,
} from './configSelectOptions'
import type { FontSizeTarget, TextAdjustField } from './graphicConfigPanels'
import { getFontConfigForTarget } from './graphicTextFonts'
import { TextAdjustNumericControl } from './TextAdjustNumericControl'
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
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="留空则显示「全文 xxx 字」"
        aria-label="顶部文案"
        className="graphic-toolbar-strip-top-text h-9 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-2 text-sm outline-none focus:border-neutral-500"
      />
    </StripShell>
  )
}

interface GraphicFontStripProps {
  target: FontSizeTarget
  selectedFontId: string
  onSelect: (font: FontOption) => void
}

export function GraphicFontStrip({ target, selectedFontId, onSelect }: GraphicFontStripProps) {
  const fonts = getFontOptionsForTarget(target)
  return (
    <StripShell>
      {fonts.map((font) => {
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

interface GraphicTextAdjustFieldStripProps {
  target: FontSizeTarget
  field: TextAdjustField
  config: GraphicTextConfig
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
  onFontSelect: (font: FontOption) => void
}

function TextAdjustFieldControl({
  target,
  field,
  config,
  onUpdate,
  onFontSelect,
}: GraphicTextAdjustFieldStripProps) {
  if (field === 'font') {
    const { fontId } = getFontConfigForTarget(config, target)
    return <GraphicFontStrip target={target} selectedFontId={fontId} onSelect={onFontSelect} />
  }

  if (target === 'title') {
    if (field === 'fontSize') {
      return (
        <TextAdjustNumericControl
          aria-label="标题字号"
          value={config.titleFontSize}
          options={TITLE_FONT_SIZE_OPTIONS}
          onChange={(value) => onUpdate({ titleFontSize: value })}
          format={(value) => `${value}px`}
        />
      )
    }
    if (field === 'lineHeight') {
      return (
        <TextAdjustNumericControl
          aria-label="标题行高"
          value={config.titleLineHeight}
          options={TITLE_LINE_HEIGHT_OPTIONS}
          onChange={(value) => onUpdate({ titleLineHeight: value })}
        />
      )
    }
    if (field === 'marginTop') {
      return (
        <TextAdjustNumericControl
          aria-label="上间距"
          value={config.titleMarginTop}
          options={TITLE_MARGIN_OPTIONS}
          onChange={(value) => onUpdate({ titleMarginTop: value })}
        />
      )
    }
    return (
      <TextAdjustNumericControl
        aria-label="下间距"
        value={config.titleMarginBottom}
        options={TITLE_MARGIN_OPTIONS}
        onChange={(value) => onUpdate({ titleMarginBottom: value })}
      />
    )
  }

  if (target === 'heading') {
    if (field === 'fontSize') {
      return (
        <TextAdjustNumericControl
          aria-label="二级字号"
          value={config.headingFontSize}
          options={HEADING_FONT_SIZE_OPTIONS}
          onChange={(value) => onUpdate({ headingFontSize: value })}
          format={(value) => `${value}px`}
        />
      )
    }
    if (field === 'marginTop') {
      return (
        <TextAdjustNumericControl
          aria-label="上间距"
          value={config.headingMarginTop}
          options={HEADING_MARGIN_OPTIONS}
          onChange={(value) => onUpdate({ headingMarginTop: value })}
        />
      )
    }
    return (
      <TextAdjustNumericControl
        aria-label="下间距"
        value={config.headingMarginBottom}
        options={HEADING_MARGIN_OPTIONS}
        onChange={(value) => onUpdate({ headingMarginBottom: value })}
      />
    )
  }

  if (target === 'code') {
    if (field === 'fontSize') {
      return (
        <TextAdjustNumericControl
          aria-label="代码块字号"
          value={config.codeFontSize}
          options={CODE_FONT_SIZE_OPTIONS}
          onChange={(value) => onUpdate({ codeFontSize: value })}
          format={(value) => `${value}px`}
        />
      )
    }

    return (
      <TextAdjustNumericControl
        aria-label="代码块行高"
        value={config.codeLineHeight}
        options={CODE_LINE_HEIGHT_OPTIONS}
        onChange={(value) => onUpdate({ codeLineHeight: value })}
      />
    )
  }

  if (field === 'fontSize') {
    return (
      <TextAdjustNumericControl
        aria-label="正文字号"
        value={config.bodyFontSize}
        options={BODY_FONT_SIZE_OPTIONS}
        onChange={(value) => onUpdate({ bodyFontSize: value })}
        format={(value) => `${value}px`}
      />
    )
  }

  return (
    <TextAdjustNumericControl
      aria-label="正文行高"
      value={config.bodyLineHeight}
      options={BODY_LINE_HEIGHT_OPTIONS}
      onChange={(value) => onUpdate({ bodyLineHeight: value })}
    />
  )
}

export function GraphicTextAdjustFieldStrip(props: GraphicTextAdjustFieldStripProps) {
  if (props.field === 'font') {
    return (
      <GraphicFontStrip
        target={props.target}
        selectedFontId={getFontConfigForTarget(props.config, props.target).fontId}
        onSelect={props.onFontSelect}
      />
    )
  }

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
  onFontSelect,
}: {
  target: FontSizeTarget
  config: GraphicTextConfig
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
  onFontSelect?: (font: FontOption) => void
}) {
  const field = target === 'body' ? 'fontSize' : 'fontSize'
  return (
    <GraphicTextAdjustFieldStrip
      target={target}
      field={field}
      config={config}
      onUpdate={onUpdate}
      onFontSelect={onFontSelect ?? (() => {})}
    />
  )
}
