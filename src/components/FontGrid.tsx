import { Cloud, Loader2 } from 'lucide-react'
import { FONT_OPTIONS, type FontOption } from '../data/fonts'

interface FontGridProps {
  selectedFontId: string
  isFontLoaded: (font: FontOption) => boolean
  isFontLoading: (fontId: string) => boolean
  onSelect: (font: FontOption) => void
  onLoadFont: (font: FontOption) => void
}

export function FontGrid({
  selectedFontId,
  isFontLoaded,
  isFontLoading,
  onSelect,
  onLoadFont,
}: FontGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {FONT_OPTIONS.map((font) => {
        const loaded = isFontLoaded(font)
        const loading = isFontLoading(font.id)
        const needsCloud =
          (font.source === 'google' || font.source === 'pixel' || font.source === 'cdn') && !loaded
        const selected = selectedFontId === font.id

        return (
          <button
            key={font.id}
            type="button"
            className={`component-font-chip relative flex h-[52px] items-center justify-center rounded-lg px-1 ${
              selected ? 'component-font-chip--selected' : ''
            }`}
            style={{ fontFamily: loaded ? font.fontFamily : 'system-ui, sans-serif' }}
            onClick={() => onSelect(font)}
          >
            <span className="truncate px-1 text-sm leading-tight">{font.label}</span>
            {needsCloud && (
              <span
                role="button"
                tabIndex={-1}
                aria-label={`加载${font.label}`}
                className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-700/80 text-neutral-300"
                onClick={(e) => {
                  e.stopPropagation()
                  onLoadFont(font)
                }}
              >
                {loading ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Cloud size={10} strokeWidth={1.5} />
                )}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
