import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

interface NavButtonLayout {
  top: number
  left: number
  right: number
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
  const [navLayout, setNavLayout] = useState<NavButtonLayout | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const currentPage = pages[activePage] ?? pages[0]

  useEffect(() => {
    setActivePage(0)
  }, [pages.length, config, markdown])

  useEffect(() => {
    setActivePage((current) => Math.min(current, Math.max(pages.length - 1, 0)))
  }, [pages.length])

  const goPrev = () => setActivePage((current) => Math.max(0, current - 1))
  const goNext = () => setActivePage((current) => Math.min(pages.length - 1, current + 1))

  const scaledWidth = sourceWidth * scale
  const scaledHeight = sourceHeight * scale

  useLayoutEffect(() => {
    const updateNavLayout = () => {
      const rect = stageRef.current?.getBoundingClientRect()
      if (!rect || rect.height <= 0) {
        setNavLayout(null)
        return
      }

      setNavLayout({
        top: rect.top + rect.height / 2,
        left: Math.max(8, rect.left - 48),
        right: Math.max(8, window.innerWidth - rect.right - 48),
      })
    }

    updateNavLayout()
    const raf = window.requestAnimationFrame(updateNavLayout)
    const observer = new ResizeObserver(updateNavLayout)
    if (stageRef.current) observer.observe(stageRef.current)

    window.addEventListener('resize', updateNavLayout)
    window.addEventListener('scroll', updateNavLayout, true)
    window.visualViewport?.addEventListener('resize', updateNavLayout)
    window.visualViewport?.addEventListener('scroll', updateNavLayout)

    return () => {
      window.cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', updateNavLayout)
      window.removeEventListener('scroll', updateNavLayout, true)
      window.visualViewport?.removeEventListener('resize', updateNavLayout)
      window.visualViewport?.removeEventListener('scroll', updateNavLayout)
    }
  }, [previewAreaHeight, activePage, scaledWidth, scaledHeight, pages.length])

  if (!currentPage) return null

  const navPortal =
    pages.length > 1 && navLayout
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="上一页"
              className="graphic-config-preview-nav graphic-config-preview-nav--portal"
              style={{ top: navLayout.top, left: navLayout.left }}
              disabled={activePage <= 0}
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                if (activePage > 0) goPrev()
              }}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              aria-label="下一页"
              className="graphic-config-preview-nav graphic-config-preview-nav--portal"
              style={{ top: navLayout.top, right: navLayout.right }}
              disabled={activePage >= pages.length - 1}
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                if (activePage < pages.length - 1) goNext()
              }}
            >
              <ChevronRight size={22} />
            </button>
          </>,
          document.body,
        )
      : null

  return (
    <>
      {navPortal}
      <div className="graphic-config-preview" style={{ height: previewAreaHeight }}>
        <div className="graphic-config-preview-body">
          {pages.length > 1 && (
            <p className="graphic-config-preview-indicator">
              {activePage + 1} / {pages.length}
            </p>
          )}

          <div ref={stageRef} className="graphic-config-preview-stage">
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
          </div>
        </div>
      </div>
    </>
  )
}
