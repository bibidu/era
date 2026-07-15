import { PAPER_COLORS, TemplatePreviewSquare } from './graphicTemplateOptions'
import { GradientPreviewArt } from './GradientPreviewArt'
import { PixelPreviewArt } from './PixelPreviewArt'
import type { GraphicPageOverlay, GraphicTextConfig } from './types'

function StripShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="graphic-toolbar-strip">
      {children}
    </div>
  )
}

const TEXTURE_OPTIONS: {
  id: Exclude<GraphicPageOverlay, 'none'>
  label: string
  preview: React.ReactNode
  previewClassName?: string
}[] = [
  {
    id: 'grid',
    label: '方格',
    preview: null,
    previewClassName: 'graphic-grid-preview',
  },
  {
    id: 'pixel',
    label: '像素',
    preview: <PixelPreviewArt />,
  },
  {
    id: 'gradient',
    label: '渐变',
    preview: <GradientPreviewArt />,
  },
]

interface GraphicTemplateSolidStripProps {
  config: GraphicTextConfig
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
}

export function GraphicTemplateSolidStrip({ config, onUpdate }: GraphicTemplateSolidStripProps) {
  return (
    <StripShell>
      <div className="graphic-toolbar-strip-scroll component-scroll-row flex gap-2">
        {PAPER_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`纸张色 ${color}`}
            className={`graphic-toolbar-strip-color ${
              config.backgroundType === 'solid' && config.paperColor === color
                ? 'graphic-toolbar-strip-color--selected'
                : ''
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onUpdate({ backgroundType: 'solid', paperColor: color })}
          />
        ))}
      </div>
    </StripShell>
  )
}

interface GraphicTemplateTextureStripProps {
  config: GraphicTextConfig
  onUpdate: (updates: Partial<GraphicTextConfig>) => void
}

export function GraphicTemplateTextureStrip({
  config,
  onUpdate,
}: GraphicTemplateTextureStripProps) {
  return (
    <StripShell>
      <div className="graphic-toolbar-strip-texture flex min-w-0 items-center">
        <div className="graphic-toolbar-strip-stack-pin flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="叠加"
            aria-pressed={config.overlayStacked}
            className={`graphic-toolbar-strip-stack-toggle ${config.overlayStacked ? 'graphic-toolbar-strip-stack-toggle--active' : ''}`}
            onClick={() => onUpdate({ overlayStacked: !config.overlayStacked })}
          >
            <span className="graphic-toolbar-strip-stack-radio" aria-hidden />
            <span>叠加</span>
          </button>
          <span className="graphic-toolbar-strip-divider" aria-hidden />
        </div>

        <div className="graphic-toolbar-strip-scroll component-scroll-row flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {TEXTURE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-label={option.label}
              aria-pressed={config.pageOverlay === option.id}
              className={`graphic-toolbar-strip-template-btn graphic-toolbar-strip-template-btn--horizontal ${
                config.pageOverlay === option.id ? 'graphic-toolbar-strip-template-btn--selected' : ''
              }`}
              onClick={() =>
                onUpdate({
                  pageOverlay: config.pageOverlay === option.id ? 'none' : option.id,
                })
              }
            >
              <TemplatePreviewSquare
                className={`graphic-toolbar-strip-template-preview ${option.previewClassName ?? ''}`}
                selected={config.pageOverlay === option.id}
              >
                {option.preview}
              </TemplatePreviewSquare>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </StripShell>
  )
}
