import { Check, Keyboard, Palette, Type } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type EditorTab = 'keyboard' | 'font' | 'style'

export const EDITOR_TABS: { id: EditorTab; label: string; icon: LucideIcon }[] = [
  { id: 'keyboard', label: '键盘', icon: Keyboard },
  { id: 'font', label: '字体', icon: Type },
  { id: 'style', label: '样式', icon: Palette },
]

interface ComponentLibraryHeaderProps {
  activeTab: EditorTab
  onTabSelect: (tab: EditorTab) => void
  onCommit: () => void
}

export function ComponentLibraryHeader({
  activeTab,
  onTabSelect,
  onCommit,
}: ComponentLibraryHeaderProps) {
  return (
    <>
      <div className="component-library-header flex shrink-0 items-center justify-between px-4 py-2">
        <h2 className="text-sm font-medium text-neutral-900">组件库</h2>
        <button type="button" aria-label="完成" className="component-done-btn" onClick={onCommit}>
          <Check size={15} strokeWidth={2} />
        </button>
      </div>

      <div className="flex shrink-0 border-b border-neutral-200 px-2">
        {EDITOR_TABS.map((tab) => {
          const Icon = tab.icon
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`component-tab flex flex-1 flex-row items-center justify-center gap-1.5 py-2 ${
                selected ? 'component-tab--active' : 'text-neutral-500'
              }`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onTabSelect(tab.id)
              }}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span className="text-xs">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
