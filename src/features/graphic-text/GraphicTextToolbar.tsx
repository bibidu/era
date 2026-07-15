import { ArrowLeft, CaseSensitive, Check, Keyboard } from 'lucide-react'
import {
  FONT_SIZE_TARGETS,
  GRAPHIC_FONT_SIZE_MENU,
  GRAPHIC_SHEET_PANELS,
  GRAPHIC_TOOLBAR_STRIPS,
  GRAPHIC_TOOLBAR_TOGGLES,
  type FontSizeNav,
  type FontSizeTarget,
  type GraphicConfigPanel,
  type ToolbarStrip,
} from './graphicConfigPanels'

interface GraphicTextToolbarProps {
  activePanel: GraphicConfigPanel | null
  activeStrip: ToolbarStrip | null
  fontSizeNav: FontSizeNav
  editorOpen: boolean
  safeAreaOpen: boolean
  saveDisabled: boolean
  onEdit: () => void
  onSelectStrip: (strip: ToolbarStrip) => void
  onSelectPanel: (panel: GraphicConfigPanel) => void
  onOpenFontSizeMenu: () => void
  onFontSizeBack: () => void
  onSelectFontSizeTarget: (target: FontSizeTarget) => void
  onToggleSafeArea: () => void
  onSave: () => void
}

export function GraphicTextToolbar({
  activePanel,
  activeStrip,
  fontSizeNav,
  editorOpen,
  safeAreaOpen,
  saveDisabled,
  onEdit,
  onSelectStrip,
  onSelectPanel,
  onOpenFontSizeMenu,
  onFontSizeBack,
  onSelectFontSizeTarget,
  onToggleSafeArea,
  onSave,
}: GraphicTextToolbarProps) {
  const inFontSizeMode = fontSizeNav !== null
  const FontSizeIcon = GRAPHIC_FONT_SIZE_MENU.icon

  return (
    <div className="graphic-text-toolbar-wrap shrink-0 px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="graphic-text-toolbar">
        <div className="graphic-text-toolbar-scroll component-scroll-row flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
          {inFontSizeMode ? (
            <>
              <button
                type="button"
                aria-label="返回"
                className="graphic-text-toolbar-back"
                onClick={onFontSizeBack}
              >
                <ArrowLeft size={20} strokeWidth={1.75} />
              </button>

              <button
                type="button"
                aria-label={GRAPHIC_FONT_SIZE_MENU.label}
                aria-pressed
                className="graphic-text-toolbar-item graphic-text-toolbar-item--active"
                onClick={onOpenFontSizeMenu}
              >
                <FontSizeIcon size={22} strokeWidth={1.5} />
                <span>{GRAPHIC_FONT_SIZE_MENU.label}</span>
              </button>

              <span className="graphic-text-toolbar-divider" aria-hidden />

              {FONT_SIZE_TARGETS.map((item) => {
                const active = fontSizeNav === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    aria-pressed={active}
                    className={`graphic-text-toolbar-subitem ${active ? 'graphic-text-toolbar-subitem--active' : ''}`}
                    onClick={() => onSelectFontSizeTarget(item.id)}
                  >
                    {item.label}
                  </button>
                )
              })}
            </>
          ) : (
            <>
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

              {GRAPHIC_TOOLBAR_STRIPS.map((item) => {
                const Icon = item.icon
                const active = activeStrip === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    aria-pressed={active}
                    className={`graphic-text-toolbar-item ${active ? 'graphic-text-toolbar-item--active' : ''}`}
                    onClick={() => onSelectStrip(item.id)}
                  >
                    <Icon size={22} strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </button>
                )
              })}

              <button
                type="button"
                aria-label={GRAPHIC_FONT_SIZE_MENU.label}
                className="graphic-text-toolbar-item"
                onClick={onOpenFontSizeMenu}
              >
                <CaseSensitive size={22} strokeWidth={1.5} />
                <span>{GRAPHIC_FONT_SIZE_MENU.label}</span>
              </button>

              {GRAPHIC_SHEET_PANELS.map((panel) => {
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

              {GRAPHIC_TOOLBAR_TOGGLES.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    aria-pressed={safeAreaOpen}
                    className={`graphic-text-toolbar-item ${safeAreaOpen ? 'graphic-text-toolbar-item--active' : ''}`}
                    onClick={onToggleSafeArea}
                  >
                    <Icon size={22} strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </>
          )}
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
