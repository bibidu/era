import { ArrowLeft, CaseSensitive, Check, Keyboard } from 'lucide-react'
import {
  FONT_SIZE_TARGETS,
  GRAPHIC_SHEET_PANELS,
  GRAPHIC_TEXT_ADJUST_MENU,
  GRAPHIC_TOOLBAR_STRIPS,
  GRAPHIC_TOOLBAR_TOGGLES,
  TEXT_ADJUST_FIELDS,
  type FontSizeNav,
  type FontSizeTarget,
  type GraphicConfigPanel,
  type TextAdjustField,
  type ToolbarStrip,
} from './graphicConfigPanels'

interface GraphicTextToolbarProps {
  activePanel: GraphicConfigPanel | null
  activeStrip: ToolbarStrip | null
  fontSizeNav: FontSizeNav
  textAdjustField: TextAdjustField | null
  editorOpen: boolean
  safeAreaOpen: boolean
  saveDisabled: boolean
  onEdit: () => void
  onSelectStrip: (strip: ToolbarStrip) => void
  onSelectPanel: (panel: GraphicConfigPanel) => void
  onOpenTextAdjustMenu: () => void
  onTextAdjustBack: () => void
  onSelectTextAdjustTarget: (target: FontSizeTarget) => void
  onSelectTextAdjustField: (field: TextAdjustField) => void
  onToggleSafeArea: () => void
  onSave: () => void
}

function isTextAdjustTarget(nav: FontSizeNav): nav is FontSizeTarget {
  return nav === 'title' || nav === 'heading' || nav === 'body'
}

export function GraphicTextToolbar({
  activePanel,
  activeStrip,
  fontSizeNav,
  textAdjustField,
  editorOpen,
  safeAreaOpen,
  saveDisabled,
  onEdit,
  onSelectStrip,
  onSelectPanel,
  onOpenTextAdjustMenu,
  onTextAdjustBack,
  onSelectTextAdjustTarget,
  onSelectTextAdjustField,
  onToggleSafeArea,
  onSave,
}: GraphicTextToolbarProps) {
  const inTextAdjustMode = fontSizeNav !== null
  const TextAdjustIcon = GRAPHIC_TEXT_ADJUST_MENU.icon
  const selectedTarget = isTextAdjustTarget(fontSizeNav) ? fontSizeNav : null
  const selectedTargetLabel = FONT_SIZE_TARGETS.find((item) => item.id === selectedTarget)?.label

  return (
    <div className="graphic-text-toolbar-wrap shrink-0 px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="graphic-text-toolbar">
        <div
          className={`graphic-text-toolbar-scroll component-scroll-row flex min-w-0 flex-1 gap-1 overflow-x-auto ${
            inTextAdjustMode ? 'items-center' : 'items-stretch'
          }`}
        >
          {inTextAdjustMode ? (
            <>
              <button
                type="button"
                aria-label="返回"
                className="graphic-text-toolbar-back"
                onClick={onTextAdjustBack}
              >
                <ArrowLeft size={20} strokeWidth={1.75} />
              </button>

              <button
                type="button"
                aria-label={GRAPHIC_TEXT_ADJUST_MENU.label}
                aria-pressed
                className="graphic-text-toolbar-item graphic-text-toolbar-item--active"
                onClick={onOpenTextAdjustMenu}
              >
                <TextAdjustIcon size={22} strokeWidth={1.5} />
                <span>{GRAPHIC_TEXT_ADJUST_MENU.label}</span>
              </button>

              <span className="graphic-text-toolbar-divider" aria-hidden />

              {selectedTarget && selectedTargetLabel ? (
                <>
                  <button
                    type="button"
                    aria-label={selectedTargetLabel}
                    aria-pressed
                    className="graphic-text-toolbar-subitem graphic-text-toolbar-subitem--active"
                    onClick={() => onSelectTextAdjustTarget(selectedTarget)}
                  >
                    {selectedTargetLabel}
                  </button>

                  <span className="graphic-text-toolbar-divider" aria-hidden />

                  {TEXT_ADJUST_FIELDS[selectedTarget].map((field) => {
                    const active = textAdjustField === field.id
                    return (
                      <button
                        key={field.id}
                        type="button"
                        aria-label={field.label}
                        aria-pressed={active}
                        className={`graphic-text-toolbar-subitem ${active ? 'graphic-text-toolbar-subitem--active' : ''}`}
                        onClick={() => onSelectTextAdjustField(field.id)}
                      >
                        {field.label}
                      </button>
                    )
                  })}
                </>
              ) : (
                FONT_SIZE_TARGETS.map((item) => {
                  const active = fontSizeNav === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={item.label}
                      aria-pressed={active}
                      className={`graphic-text-toolbar-subitem ${active ? 'graphic-text-toolbar-subitem--active' : ''}`}
                      onClick={() => onSelectTextAdjustTarget(item.id)}
                    >
                      {item.label}
                    </button>
                  )
                })
              )}
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
                aria-label={GRAPHIC_TEXT_ADJUST_MENU.label}
                className="graphic-text-toolbar-item"
                onClick={onOpenTextAdjustMenu}
              >
                <CaseSensitive size={22} strokeWidth={1.5} />
                <span>{GRAPHIC_TEXT_ADJUST_MENU.label}</span>
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
