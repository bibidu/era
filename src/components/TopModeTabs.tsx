export type AppMode = 'graphic' | 'data'

interface TopModeTabsProps {
  value: AppMode
  onChange: (mode: AppMode) => void
}

const TABS: { id: AppMode; label: string }[] = [
  { id: 'graphic', label: '图文' },
  { id: 'data', label: '数据分析' },
]

export function TopModeTabs({ value, onChange }: TopModeTabsProps) {
  return (
    <div className="grid w-full max-w-56 grid-cols-2 rounded-xl bg-neutral-100 p-1">
      {TABS.map((tab) => (
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
