import { useEffect, useRef, useState } from 'react'
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
  const pagerRef = useRef<HTMLDivElement>(null)
  const [activePage, setActivePage] = useState(0)

  useEffect(() => {
    setActivePage((current) => Math.min(current, Math.max(pages.length - 1, 0)))
  }, [pages.length])

  useEffect(() => {
    setActivePage(0)
  }, [markdown])

  useEffect(() => {
    const pager = pagerRef.current
    if (!pager || !pager.clientWidth) return
    pager.scrollLeft = activePage * pager.clientWidth
  }, [activePage, sourceWidth, scale, pages.length])

  const handlePagerScroll = () => {
    const pager = pagerRef.current
    if (!pager || !pager.clientWidth) return
    setActivePage(Math.round(pager.scrollLeft / pager.clientWidth))
  }

  if (!pages.length) return null

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

        <div
          ref={pagerRef}
          className="graphic-config-preview-pager"
          onScroll={handlePagerScroll}
        >
          {pages.map((page) => (
            <div key={page.index} className="graphic-config-preview-slide">
              <div
                className="graphic-config-preview-slide-inner"
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
                  page={page}
                  config={config}
                  markdown={markdown}
                  showSafeArea={showSafeArea}
                  displayWidth={sourceWidth}
                  className="pointer-events-none rounded-xl shadow-lg"
                />
              </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
