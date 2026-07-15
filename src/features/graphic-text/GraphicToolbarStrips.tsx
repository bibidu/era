import { FONT_OPTIONS, type FontOption } from '../../data/fonts'
import { GRAPHIC_ASPECT_RATIO_OPTIONS, type GraphicAspectRatio } from './types'

interface GraphicFontStripProps {
  selectedFontId: string
  onSelect: (font: FontOption) => void
}

export function GraphicFontStrip({ selectedFontId, onSelect }: GraphicFontStripProps) {
  return (
    <div className="graphic-toolbar-strip">
      <div className="graphic-toolbar-strip-scroll component-scroll-row flex items-stretch gap-2 overflow-x-auto">
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
      </div>
    </div>
  )
}

function parseAspectNumbers(id: string) {
  const [width, height] = id.split(':').map(Number)
  return { width, height }
}

function aspectPreviewSize(id: string, maxDim = 22) {
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
    <div className="graphic-toolbar-strip">
      <div className="graphic-toolbar-strip-scroll component-scroll-row flex items-center gap-3 overflow-x-auto">
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
                style={{ width: preview.width + 10, height: preview.height + 10 }}
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
      </div>
    </div>
  )
}
