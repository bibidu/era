import { Cloud, Loader2 } from 'lucide-react'
import { Collection, ListBox, Select } from '@heroui/react'
import { FONT_COUNT, FONT_OPTIONS, type FontOption } from '../data/fonts'

interface FontSelectProps {
  selectedFontId: string
  isFontLoaded: (font: FontOption) => boolean
  isFontLoading: (fontId: string) => boolean
  onSelect: (font: FontOption) => void
  onLoadFont: (font: FontOption) => void
}

export function FontSelect({
  selectedFontId,
  isFontLoaded,
  isFontLoading,
  onSelect,
  onLoadFont,
}: FontSelectProps) {
  const current = FONT_OPTIONS.find((f) => f.id === selectedFontId) ?? FONT_OPTIONS[0]
  const currentLoaded = isFontLoaded(current)

  return (
    <Select
      aria-label="字体"
      selectedKey={selectedFontId}
      onSelectionChange={(key) => {
        const font = FONT_OPTIONS.find((f) => f.id === key)
        if (font) onSelect(font)
      }}
      fullWidth
    >
      <Select.Trigger className="border-neutral-300">
        <Select.Value>
          <span
            className="text-sm text-black"
            style={{ fontFamily: currentLoaded ? current.fontFamily : 'system-ui, sans-serif' }}
          >
            {current.sample}
          </span>
        </Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox className="max-h-80 overflow-y-auto overscroll-contain">
          <Collection items={FONT_OPTIONS}>
            {(font) => {
              const loaded = isFontLoaded(font)
              const loading = isFontLoading(font.id)
              const needsCloud = font.source === 'google' && !loaded

              return (
                <ListBox.Item
                  key={font.id}
                  id={font.id}
                  textValue={font.label}
                  className="py-2"
                >
                  <div className="flex w-full items-center gap-2">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-xs text-neutral-500">{font.label}</span>
                      <span
                        className="truncate text-sm text-black"
                        style={{ fontFamily: loaded ? font.fontFamily : 'system-ui, sans-serif' }}
                      >
                        {font.sample}
                      </span>
                    </div>
                    {needsCloud && (
                      <button
                        type="button"
                        aria-label={`加载${font.label}`}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-500"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          onLoadFont(font)
                        }}
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Cloud size={14} strokeWidth={1.5} />
                        )}
                      </button>
                    )}
                  </div>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )
            }}
          </Collection>
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

export { FONT_COUNT }
