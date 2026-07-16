import { ArrowLeft, CaseSensitive } from 'lucide-react'
import type { FontOption } from '../../data/fonts'
import {
  FONT_SIZE_TARGETS,
  GRAPHIC_TEXT_ADJUST_MENU,
  TEXT_ADJUST_FIELDS,
  type FontSizeNav,
  type FontSizeTarget,
  type TextAdjustField,
} from './graphicConfigPanels'
import { GraphicTextAdjustFieldStrip } from './GraphicToolbarStrips'
import type { GraphicTextConfig } from './types'

function isTextAdjustTarget(nav: FontSizeNav): nav is FontSizeTarget {
  return nav === 'title' || nav === 'heading' || nav === 'body' || nav === 'code'
}

interface GraphicContentTextAdjustProps {
  fontSizeNav: FontSizeNav
  textAdjustField: TextAdjustField | null
  config: GraphicTextConfig
  onOpenMenu: () => void
  onBack: () => void
  onSelectTarget: (target: FontSizeTarget) => void
  onSelectField: (field: TextAdjustField) => void
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
  onFontSelect: (font: FontOption) => void
}

export function GraphicContentTextAdjust({
  fontSizeNav,
  textAdjustField,
  config,
  onOpenMenu,
  onBack,
  onSelectTarget,
  onSelectField,
  onUpdate,
  onFontSelect,
}: GraphicContentTextAdjustProps) {
  const TextAdjustIcon = GRAPHIC_TEXT_ADJUST_MENU.icon
  const selectedTarget = isTextAdjustTarget(fontSizeNav) ? fontSizeNav : null
  const selectedTargetItem = FONT_SIZE_TARGETS.find((item) => item.id === selectedTarget)
  const showFieldStrip = textAdjustField !== null && selectedTarget !== null

  return (
    <div className="graphic-content-text-adjust">
      <div className="graphic-content-text-adjust-nav">
        {fontSizeNav === null ? (
          <button
            type="button"
            className="graphic-content-text-adjust-entry"
            onClick={onOpenMenu}
          >
            <CaseSensitive size={18} strokeWidth={1.5} />
            <span>{GRAPHIC_TEXT_ADJUST_MENU.label}</span>
          </button>
        ) : (
          <div className="graphic-content-text-adjust-toolbar">
            <button
              type="button"
              aria-label="返回"
              className="graphic-content-text-adjust-back"
              onClick={onBack}
            >
              <ArrowLeft size={18} strokeWidth={1.75} />
            </button>

            <div className="graphic-content-text-adjust-scroll component-scroll-row">
              {selectedTargetItem ? (
                <>
                  <span className="graphic-content-text-adjust-label">
                    <selectedTargetItem.icon size={18} strokeWidth={1.5} />
                    <span>{selectedTargetItem.label}</span>
                  </span>

                  <span className="graphic-content-text-adjust-divider" aria-hidden />

                  {TEXT_ADJUST_FIELDS[selectedTargetItem.id].map((field) => {
                    const active = textAdjustField === field.id
                    return (
                      <button
                        key={field.id}
                        type="button"
                        aria-label={field.label}
                        aria-pressed={active}
                        className={`graphic-content-text-adjust-subitem ${active ? 'graphic-content-text-adjust-subitem--active' : ''}`}
                        onClick={() => onSelectField(field.id)}
                      >
                        {field.label}
                      </button>
                    )
                  })}
                </>
              ) : (
                <>
                  <span className="graphic-content-text-adjust-label">
                    <TextAdjustIcon size={18} strokeWidth={1.5} />
                    <span>{GRAPHIC_TEXT_ADJUST_MENU.label}</span>
                  </span>

                  <span className="graphic-content-text-adjust-divider" aria-hidden />

                  {FONT_SIZE_TARGETS.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={item.label}
                        className="graphic-content-text-adjust-item"
                        onClick={() => onSelectTarget(item.id)}
                      >
                        <Icon size={18} strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showFieldStrip && (
        <div className="graphic-content-text-adjust-field">
          <GraphicTextAdjustFieldStrip
            target={selectedTarget}
            field={textAdjustField}
            config={config}
            onUpdate={onUpdate}
            onFontSelect={onFontSelect}
          />
        </div>
      )}
    </div>
  )
}
