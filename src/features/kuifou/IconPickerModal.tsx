import { Image, Smile, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CATEGORY_ICONS, EMOJI_PICKER } from './categories'

type Tab = 'icons' | 'emoji' | 'custom'

const TABS: { id: Tab; label: string; icon: typeof Smile }[] = [
  { id: 'icons', label: '图标', icon: Image },
  { id: 'emoji', label: '表情', icon: Smile },
  { id: 'custom', label: '自定义', icon: Sparkles },
]

export function IconPickerModal({
  open,
  value,
  onClose,
  onSelect,
}: {
  open: boolean
  value: string
  onClose: () => void
  onSelect: (icon: string) => void
}) {
  const [tab, setTab] = useState<Tab>('emoji')
  const [custom, setCustom] = useState('')

  const iconPool = useMemo(() => {
    const set = new Set<string>()
    for (const list of Object.values(CATEGORY_ICONS)) {
      for (const item of list) set.add(item)
    }
    return [...set]
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="选择图标"
      onClick={onClose}
    >
      <div
        className="flex max-h-[78dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">选择图标</h2>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="关闭"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 border-b border-slate-100 px-2 py-2">
          {TABS.map((item) => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                className="flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium"
                style={{
                  background: active ? '#EFF6FF' : 'transparent',
                  color: active ? '#2563EB' : '#64748B',
                }}
                onClick={() => setTab(item.id)}
              >
                <Icon size={15} />
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {tab === 'custom' ? (
            <div className="space-y-3 p-2">
              <p className="text-sm text-slate-500">粘贴任意 emoji 作为图标</p>
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="例如 👜"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-lg outline-none focus:border-blue-400"
              />
              <button
                type="button"
                className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                disabled={!custom.trim()}
                onClick={() => {
                  onSelect(custom.trim().slice(0, 8))
                  onClose()
                }}
              >
                使用该图标
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2">
              {(tab === 'emoji' ? EMOJI_PICKER : iconPool).map((emoji) => {
                const selected = value === emoji
                return (
                  <button
                    key={`${tab}-${emoji}`}
                    type="button"
                    className="flex aspect-square items-center justify-center rounded-2xl text-2xl transition"
                    style={{
                      background: selected ? '#DBEAFE' : '#F8FAFC',
                      boxShadow: selected ? 'inset 0 0 0 2px #2563EB' : 'none',
                    }}
                    onClick={() => {
                      onSelect(emoji)
                      onClose()
                    }}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
