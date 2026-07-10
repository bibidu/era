import { Settings2, Type } from 'lucide-react'
import type { TextElement } from '../types'

interface MaterialBarProps {
  texts: TextElement[]
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenConfig: (id: string) => void
}

export function MaterialBar({ texts, selectedId, onSelect, onOpenConfig }: MaterialBarProps) {
  if (texts.length === 0) return null

  return (
    <div className="border-t border-neutral-200 bg-white px-4 py-3">
      <p className="mb-2 text-xs text-neutral-500">已添加素材</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {texts.map((text, index) => {
          const selected = selectedId === text.id
          return (
            <div
              key={text.id}
              className={`flex shrink-0 flex-col items-center gap-1.5 ${
                selected ? 'opacity-100' : 'opacity-70'
              }`}
            >
              <button
                type="button"
                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                  selected
                    ? 'border-black bg-black text-white'
                    : 'border-neutral-300 bg-white text-black'
                }`}
                onClick={() => onSelect(text.id)}
              >
                <Type size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label={`配置素材 ${index + 1}`}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 active:bg-neutral-100"
                onClick={() => onOpenConfig(text.id)}
              >
                <Settings2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
