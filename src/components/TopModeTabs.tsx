export type AppMode = 'poster' | 'graphic'

interface TopModeTabsProps {
  value: AppMode
  onChange: (mode: AppMode) => void
}

export function TopModeTabs({ value, onChange }: TopModeTabsProps) {
  return (
    <div className="grid w-full max-w-56 grid-cols-2 rounded-xl bg-neutral-100 p-1">
      {[
        { id: 'poster' as const, label: '海报' },
        { id: 'graphic' as const, label: '图文' },
      ].map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`h-8 rounded-lg text-sm font-medium transition-colors ${
            value === tab.id ? 'bg-white text-black shadow-sm' : 'text-neutral-500'
          }`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
