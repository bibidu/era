import { Cloud, Loader2 } from 'lucide-react'
import type { FontOption } from '../types'
import { FONT_OPTIONS } from '../types'

interface FontPickerProps {
  selectedFontId: string
  isFontLoaded: (font: FontOption) => boolean
  isFontLoading: (fontId: string) => boolean
  onSelect: (font: FontOption) => void
  onLoadFont: (font: FontOption) => void
}

export function FontPicker({
  selectedFontId,
  isFontLoaded,
  isFontLoading,
  onSelect,
  onLoadFont,
}: FontPickerProps) {
  return (
    <div className="flex flex-col gap-1">
      {FONT_OPTIONS.map((font) => {
        const loaded = isFontLoaded(font)
        const loading = isFontLoading(font.id)
        const selected = selectedFontId === font.id
        const needsCloud = font.source === 'google' && !loaded

        return (
          <div
            key={font.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
              selected ? 'border-black bg-neutral-50' : 'border-neutral-200 bg-white'
            }`}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
              onClick={() => onSelect(font)}
            >
              <span className="text-xs text-neutral-500">{font.label}</span>
              <span
                className="truncate text-base text-black"
                style={{ fontFamily: loaded ? font.fontFamily : 'system-ui, sans-serif' }}
              >
                {font.sample}
              </span>
            </button>

            {needsCloud && (
              <button
                type="button"
                aria-label={`加载${font.label}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 active:bg-neutral-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onLoadFont(font)
                }}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Cloud size={16} strokeWidth={1.5} />
                )}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
