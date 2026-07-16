import { ArrowLeft, CaseSensitive, Download, Keyboard } from 'lucide-react'
import {
  FONT_SIZE_TARGETS,
  GRAPHIC_HIGHLIGHT_PANEL,
  GRAPHIC_TEXT_ADJUST_MENU,
  GRAPHIC_TOOLBAR_STRIPS,
  GRAPHIC_TOOLBAR_TOGGLES,
  GRAPHIC_TOP_TEXT_PANEL,
  TEXT_ADJUST_FIELDS,
  type FontSizeNav,
  type FontSizeTarget,
  type GraphicConfigPanel,
  type TemplateNav,
  type TextAdjustField,
  type ToolbarStrip,
} from './graphicConfigPanels'
import { TemplatePreviewSquare } from './graphicTemplateOptions'
import type { GraphicTextConfig } from './types'

interface GraphicTextToolbarProps {
  activePanel: GraphicConfigPanel | null
  activeStrip: ToolbarStrip | null
  fontSizeNav: FontSizeNav
  textAdjustField: TextAdjustField | null
  templateNav: TemplateNav
  config: GraphicTextConfig
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
  onTemplateBack: () => void
  onPickReferenceImage: () => void
  onSelectTemplateSolid: () => void
  onSelectTemplateTexture: () => void
  onToggleSafeArea: () => void
  onSave: () => void
}

function isTextAdjustTarget(nav: FontSizeNav): nav is FontSizeTarget {
  return nav === 'title' || nav === 'heading' || nav === 'body' || nav === 'code'
}

export function GraphicTextToolbar({
  activePanel,
  activeStrip,
  fontSizeNav,
  textAdjustField,
  templateNav,
  config,
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
  onTemplateBack,
  onPickReferenceImage,
  onSelectTemplateSolid,
  onSelectTemplateTexture,
  onToggleSafeArea,
  onSave,
}: GraphicTextToolbarProps) {
  const inTextAdjustMode = fontSizeNav !== null
  const inTemplateMode = activeStrip === 'template'
  const TextAdjustIcon = GRAPHIC_TEXT_ADJUST_MENU.icon
  const selectedTarget = isTextAdjustTarget(fontSizeNav) ? fontSizeNav : null
  const selectedTargetItem = FONT_SIZE_TARGETS.find((item) => item.id === selectedTarget)
  const TopTextIcon = GRAPHIC_TOP_TEXT_PANEL.icon
  const HighlightIcon = GRAPHIC_HIGHLIGHT_PANEL.icon
  const TemplateIcon = GRAPHIC_TOOLBAR_STRIPS.find((item) => item.id === 'template')?.icon

  return (
    <div className="graphic-text-toolbar-wrap shrink-0 px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="graphic-text-toolbar">
        {inTextAdjustMode ? (
          <div className="graphic-text-toolbar-text-adjust flex min-w-0 flex-1 items-center">
            <button
              type="button"
              aria-label="返回"
              className="graphic-text-toolbar-back graphic-text-toolbar-back--pinned"
              onClick={onTextAdjustBack}
            >
              <ArrowLeft size={20} strokeWidth={1.75} />
            </button>

            <div className="graphic-text-toolbar-scroll component-scroll-row flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
              {selectedTargetItem ? (
                <>
                  <span className="graphic-text-toolbar-item graphic-text-toolbar-item--label">
                    <selectedTargetItem.icon size={22} strokeWidth={1.5} />
                    <span>{selectedTargetItem.label}</span>
                  </span>

                  <span className="graphic-text-toolbar-divider graphic-text-toolbar-divider--centered" aria-hidden />

                  {TEXT_ADJUST_FIELDS[selectedTargetItem.id].map((field) => {
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
                <>
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

                  <span className="graphic-text-toolbar-divider graphic-text-toolbar-divider--centered" aria-hidden />

                  {FONT_SIZE_TARGETS.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={item.label}
                        className="graphic-text-toolbar-item"
                        onClick={() => onSelectTextAdjustTarget(item.id)}
                      >
                        <Icon size={22} strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        ) : inTemplateMode ? (
          <div className="graphic-text-toolbar-text-adjust graphic-text-toolbar-template flex min-w-0 flex-1 items-center">
            <button
              type="button"
              aria-label="返回"
              className="graphic-text-toolbar-back graphic-text-toolbar-back--pinned"
              onClick={onTemplateBack}
            >
              <ArrowLeft size={20} strokeWidth={1.75} />
            </button>

            <div className="graphic-text-toolbar-scroll component-scroll-row flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
              {TemplateIcon && (
                <span className="graphic-text-toolbar-item graphic-text-toolbar-item--label">
                  <TemplateIcon size={22} strokeWidth={1.5} />
                  <span>模板</span>
                </span>
              )}

              <span className="graphic-text-toolbar-divider graphic-text-toolbar-divider--centered" aria-hidden />

              <button
                type="button"
                aria-label="参考图"
                aria-pressed={config.overlayStacked && config.backgroundType === 'reference'}
                className={`graphic-text-toolbar-item graphic-text-toolbar-template-item ${
                  config.overlayStacked && config.backgroundType === 'reference'
                    ? 'graphic-text-toolbar-item--active'
                    : ''
                } ${!config.overlayStacked ? 'graphic-text-toolbar-template-item--muted' : ''}`}
                onClick={onPickReferenceImage}
              >
                <TemplatePreviewSquare
                  className="graphic-text-toolbar-template-preview"
                  selected={config.overlayStacked && config.backgroundType === 'reference'}
                >
                  {config.backgroundUrl ? (
                    <img src={config.backgroundUrl} alt="" className="size-full object-cover" />
                  ) : null}
                </TemplatePreviewSquare>
                <span>参考图</span>
              </button>

              <button
                type="button"
                aria-label="纯色"
                aria-pressed={templateNav === 'solid'}
                className={`graphic-text-toolbar-item graphic-text-toolbar-template-item ${
                  templateNav === 'solid' ? 'graphic-text-toolbar-item--active' : ''
                } ${!config.overlayStacked ? 'graphic-text-toolbar-template-item--muted' : ''}`}
                onClick={onSelectTemplateSolid}
              >
                <TemplatePreviewSquare
                  className="graphic-text-toolbar-template-preview"
                  selected={config.overlayStacked && config.backgroundType === 'solid'}
                >
                  <span
                    className="size-full"
                    style={{ backgroundColor: config.paperColor }}
                    aria-hidden
                  />
                </TemplatePreviewSquare>
                <span>纯色</span>
              </button>

              <button
                type="button"
                aria-label="特殊质感"
                aria-pressed={templateNav === 'texture'}
                className={`graphic-text-toolbar-item graphic-text-toolbar-template-item ${
                  templateNav === 'texture' ? 'graphic-text-toolbar-item--active' : ''
                }`}
                onClick={onSelectTemplateTexture}
              >
                <TemplatePreviewSquare
                  className="graphic-text-toolbar-template-preview"
                  selected={templateNav === 'texture' || config.pageOverlay !== 'none'}
                >
                  <span className="size-full bg-neutral-100" aria-hidden />
                </TemplatePreviewSquare>
                <span>特殊质感</span>
              </button>
            </div>
          </div>
        ) : (
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

            <button
              type="button"
              aria-label={GRAPHIC_HIGHLIGHT_PANEL.label}
              aria-pressed={activePanel === GRAPHIC_HIGHLIGHT_PANEL.id}
              className={`graphic-text-toolbar-item ${activePanel === GRAPHIC_HIGHLIGHT_PANEL.id ? 'graphic-text-toolbar-item--active' : ''}`}
              onClick={() => onSelectPanel(GRAPHIC_HIGHLIGHT_PANEL.id)}
            >
              <HighlightIcon size={22} strokeWidth={1.5} />
              <span>{GRAPHIC_HIGHLIGHT_PANEL.label}</span>
            </button>

            <button
              type="button"
              aria-label={GRAPHIC_TOP_TEXT_PANEL.label}
              aria-pressed={activeStrip === GRAPHIC_TOP_TEXT_PANEL.id}
              className={`graphic-text-toolbar-item ${activeStrip === GRAPHIC_TOP_TEXT_PANEL.id ? 'graphic-text-toolbar-item--active' : ''}`}
              onClick={() => onSelectStrip(GRAPHIC_TOP_TEXT_PANEL.id)}
            >
              <TopTextIcon size={22} strokeWidth={1.5} />
              <span>{GRAPHIC_TOP_TEXT_PANEL.label}</span>
            </button>

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
          </div>
        )}

        <div className="graphic-text-toolbar-fade" aria-hidden />

        <button
          type="button"
          aria-label="下载图片"
          disabled={saveDisabled}
          className="graphic-text-toolbar-save"
          onClick={onSave}
        >
          <Download size={18} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  )
}
