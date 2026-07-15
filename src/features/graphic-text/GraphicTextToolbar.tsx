import { Check, Keyboard } from 'lucide-react'
import { GRAPHIC_CONFIG_PANELS, type GraphicConfigPanel } from './graphicConfigPanels'

interface GraphicTextToolbarProps {
  activePanel: GraphicConfigPanel | null
  editorOpen: boolean
  saveDisabled: boolean
  onEdit: () => void
  onSelectPanel: (panel: GraphicConfigPanel) => void
  onSave: () => void
}

export function GraphicTextToolbar({
  activePanel,
  editorOpen,
  saveDisabled,
  onEdit,
  onSelectPanel,
  onSave,
}: GraphicTextToolbarProps) {
  return (
    <div className="graphic-text-toolbar-wrap shrink-0 px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="graphic-text-toolbar">
        <div className="graphic-text-toolbar-scroll component-scroll-row flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
          <button
            type="button"
            aria-label="编辑"
            aria-pressed={editorOpen}
            className={`graphic-text-toolbar-item ${editorOpen ? 'graphic-text-toolbar-item--active' : ''}`}
            onClick={onEdit}
          >
            <Keyboard size={22} strokeWidth={1.5} />
            <span>编辑</span>
          </button>

          {GRAPHIC_CONFIG_PANELS.map((panel) => {
            const Icon = panel.icon
            const active = activePanel === panel.id
            return (
              <button
                key={panel.id}
                type="button"
                aria-label={panel.label}
                aria-pressed={active}
                className={`graphic-text-toolbar-item ${active ? 'graphic-text-toolbar-item--active' : ''}`}
                onClick={() => onSelectPanel(panel.id)}
              >
                <Icon size={22} strokeWidth={1.5} />
                <span>{panel.label}</span>
              </button>
            )
          })}
        </div>

        <div className="graphic-text-toolbar-fade" aria-hidden />

        <button
          type="button"
          aria-label="保存图片"
          disabled={saveDisabled}
          className="graphic-text-toolbar-save"
          onClick={onSave}
        >
          <Check size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
