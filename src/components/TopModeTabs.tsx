import { Moon, Sun, Wallet } from 'lucide-react'
import type { EraTheme } from '../theme/theme'

export type AppMode = 'graphic' | 'data' | 'highlight' | 'title'

interface TopModeTabsProps {
  value: AppMode
  onChange: (mode: AppMode) => void
  theme: EraTheme
  onToggleTheme: () => void
  onOpenBalance?: () => void
}

const TABS: { id: AppMode; label: string }[] = [
  { id: 'graphic', label: '图文' },
  { id: 'data', label: '社媒' },
  { id: 'highlight', label: '高亮' },
  { id: 'title', label: '标题' },
]

export function TopModeTabs({
  value,
  onChange,
  theme,
  onToggleTheme,
  onOpenBalance,
}: TopModeTabsProps) {
  return (
    <div className="flex w-full max-w-lg items-center gap-2">
      <div
        className="grid flex-1 grid-cols-4 rounded-xl p-1"
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
      {onOpenBalance ? (
        <button
          type="button"
          aria-label="账户余额"
          title="账户余额"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border transition hover:opacity-90"
          style={{
            borderColor: 'var(--era-border)',
            background: 'var(--era-panel)',
            color: 'var(--era-fg)',
          }}
          onClick={onOpenBalance}
        >
          <Wallet size={16} />
        </button>
      ) : null}
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
