import { useRef, useState } from 'react'
import { GraphicPage } from './GraphicPage'
import type { GraphicTextConfig, GraphicTextPage } from './types'

interface GraphicConfigPreviewProps {
  pages: GraphicTextPage[]
  config: GraphicTextConfig
  markdown: string
  previewAreaHeight: number
  pageWidth: number
  showSafeArea?: boolean
}

export function GraphicConfigPreview({
  pages,
  config,
  markdown,
  previewAreaHeight,
  pageWidth,
  showSafeArea = false,
}: GraphicConfigPreviewProps) {
  const pagerRef = useRef<HTMLDivElement>(null)
  const [activePage, setActivePage] = useState(0)

  const handleScroll = () => {
    const pager = pagerRef.current
    if (!pager || !pager.clientWidth) return
    setActivePage(Math.round(pager.scrollLeft / pager.clientWidth))
  }

  return (
    <div className="graphic-config-preview" style={{ height: previewAreaHeight }}>
      {pages.length > 1 && (
        <p className="graphic-config-preview-indicator">
          {activePage + 1} / {pages.length} · 左右滑动切换
        </p>
      )}
      <div
        ref={pagerRef}
        className="graphic-config-preview-pager"
        onScroll={handleScroll}
      >
        {pages.map((page) => (
          <div key={page.index} className="graphic-config-preview-slide">
            <GraphicPage
              page={page}
              config={config}
              markdown={markdown}
              showSafeArea={showSafeArea}
              displayWidth={pageWidth}
              className="pointer-events-none rounded-xl shadow-lg"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
