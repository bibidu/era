import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GraphicPage } from './GraphicPage'
import type { GraphicTextConfig, GraphicTextPage } from './types'

interface GraphicConfigPreviewProps {
  pages: GraphicTextPage[]
  config: GraphicTextConfig
  markdown: string
  previewAreaHeight: number
  sourceWidth: number
  sourceHeight: number
  scale: number
  showSafeArea?: boolean
}

export function GraphicConfigPreview({
  pages,
  config,
  markdown,
  previewAreaHeight,
  sourceWidth,
  sourceHeight,
  scale,
  showSafeArea = false,
}: GraphicConfigPreviewProps) {
  const [activePage, setActivePage] = useState(0)
  const currentPage = pages[activePage] ?? pages[0]

  useEffect(() => {
    setActivePage((current) => Math.min(current, Math.max(pages.length - 1, 0)))
  }, [pages.length])

  useEffect(() => {
    setActivePage(0)
  }, [markdown])

  const goPrev = () => setActivePage((current) => Math.max(0, current - 1))
  const goNext = () => setActivePage((current) => Math.min(pages.length - 1, current + 1))

  if (!currentPage) return null

  const scaledWidth = sourceWidth * scale
  const scaledHeight = sourceHeight * scale

  return (
    <div className="graphic-config-preview" style={{ height: previewAreaHeight }}>
      <div className="graphic-config-preview-body">
        {pages.length > 1 && (
          <p className="graphic-config-preview-indicator">
            {activePage + 1} / {pages.length}
          </p>
        )}

        <div className="graphic-config-preview-stage">
          <button
            type="button"
            aria-label="上一页"
            className="graphic-config-preview-nav"
            disabled={activePage <= 0}
            onClick={goPrev}
          >
            <ChevronLeft size={22} />
          </button>

          <div
            className="graphic-config-preview-page"
            style={{ width: scaledWidth, height: scaledHeight }}
          >
            <div
              className="graphic-config-preview-page-scale"
              style={{
                width: sourceWidth,
                height: sourceHeight,
                transform: `scale(${scale})`,
              }}
            >
              <GraphicPage
                page={currentPage}
                config={config}
                markdown={markdown}
                showSafeArea={showSafeArea}
                displayWidth={sourceWidth}
                className="pointer-events-none rounded-xl shadow-lg"
              />
            </div>
          </div>

          <button
            type="button"
            aria-label="下一页"
            className="graphic-config-preview-nav"
            disabled={activePage >= pages.length - 1}
            onClick={goNext}
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>
    </div>
  )
}
