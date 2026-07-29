import { Moon, Sun } from 'lucide-react'
import type { EraTheme } from '../theme/theme'

export type AppMode = 'graphic' | 'data' | 'highlight'

interface TopModeTabsProps {
  value: AppMode
  onChange: (mode: AppMode) => void
  theme: EraTheme
  onToggleTheme: () => void
}

const TABS: { id: AppMode; label: string }[] = [
  { id: 'graphic', label: '图文' },
  { id: 'data', label: '数据分析' },
  { id: 'highlight', label: '高亮' },
]

export function TopModeTabs({ value, onChange, theme, onToggleTheme }: TopModeTabsProps) {
  return (
    <div className="flex w-full max-w-lg items-center gap-2">
      <div
        className="grid flex-1 grid-cols-3 rounded-xl p-1"
        style={{ background: 'var(--era-tab-track)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="h-8 rounded-lg px-1 text-sm font-medium transition-colors"
            style={
              value === tab.id
                ? {
                    background: 'var(--era-tab-active)',
                    color: 'var(--era-fg)',
                    boxShadow: '0 1px 2px rgb(0 0 0 / 0.12)',
                  }
                : { color: 'var(--era-tab-inactive)' }
            }
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
        className="flex size-9 shrink-0 items-center justify-center rounded-xl border transition hover:opacity-90"
        style={{
          borderColor: 'var(--era-border)',
          background: 'var(--era-panel)',
          color: 'var(--era-fg)',
        }}
        onClick={onToggleTheme}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  )
}
