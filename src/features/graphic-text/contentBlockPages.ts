import type { GraphicDocument } from './document'
import { paginateDocument } from './layout'
import type { GraphicTextConfig } from './types'

export function buildContentBlockPageMap(
  document: GraphicDocument,
  config: GraphicTextConfig,
): Map<string, number> {
  const pages = paginateDocument(document, config)
  const map = new Map<string, number>()

  pages.forEach((page, pageIndex) => {
    const pageNumber = pageIndex + 1
    for (const block of page.blocks) {
      const sourceId = block.sourceBlockId ?? block.id
      const contentBlockId = sourceId.includes('::') ? sourceId.split('::')[0] : sourceId
      if (!map.has(contentBlockId)) {
        map.set(contentBlockId, pageNumber)
      }
    }
  })

  return map
}
