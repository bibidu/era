export interface PageRailSegment {
  page: number
  top: number
  height: number
}

export function mergePageRailSegments(items: PageRailSegment[]): PageRailSegment[] {
  const segments: PageRailSegment[] = []

  for (const item of items) {
    const previous = segments[segments.length - 1]
    if (previous && previous.page === item.page) {
      const bottom = Math.max(previous.top + previous.height, item.top + item.height)
      previous.height = bottom - previous.top
      continue
    }
    segments.push({ ...item })
  }

  return segments
}

export function GraphicPageRail({ segments }: { segments: PageRailSegment[] }) {
  if (!segments.length) return null

  return (
    <div className="graphic-highlight-page-rail" aria-hidden>
      {segments.map((segment, index) => (
        <span
          key={`${segment.page}-${segment.top}-${index}`}
          className={`graphic-highlight-page-rail-segment ${
            segment.page % 2 === 1
              ? 'graphic-highlight-page-rail-segment--odd'
              : 'graphic-highlight-page-rail-segment--even'
          }`}
          style={{ top: segment.top, height: segment.height }}
          title={`第 ${segment.page} 页`}
        />
      ))}
    </div>
  )
}
