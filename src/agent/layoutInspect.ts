import { getGraphicLayout, paginateDocument } from '../features/graphic-text/layout'
import { stripHighlightMarkers } from '../features/graphic-text/inlineHighlight'
import { getFontConfigForStyleType } from '../features/graphic-text/graphicTextFonts'
import type { GraphicDocument } from '../features/graphic-text/document'
import type { GraphicTextConfig, MarkdownBlock } from '../features/graphic-text/types'
import type { LayoutWarning } from './protocol'

/** 独行标点：该行去除空白后仅含标点、无其它文字 */
const PUNCTUATION_ONLY_LINE =
  /^[\s。！？!?、，,；;：:…·．.\-—–…⋯~～《》〈〉「」『』【】（）()[\]"'“”‘’]+$/u

function resolvePrimaryFontFamily(fontFamily: string) {
  return fontFamily.replace(/"/g, '').split(',')[0].trim()
}

function measureLineWidth(text: string, fontFamily: string, fontSize: number, fontWeight: number) {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return 0
  ctx.font = `${fontWeight} ${fontSize}px ${resolvePrimaryFontFamily(fontFamily)}`
  return ctx.measureText(stripHighlightMarkers(text)).width
}

function isPunctuationOnlyLine(text: string) {
  const plain = stripHighlightMarkers(text).trim()
  if (!plain) return false
  return PUNCTUATION_ONLY_LINE.test(plain)
}

/**
 * 基于当前分页结果做异常检测：
 * - 单行溢出
 * - 孤行（跨页后仅剩 1 行）
 * - 独行标点
 * 不含 max_pages / 标题跨页
 */
export function inspectGraphicLayout(
  document: GraphicDocument,
  config: GraphicTextConfig,
): { pageCount: number; warnings: LayoutWarning[] } {
  const layout = getGraphicLayout(config)
  const pages = paginateDocument(document, config)
  const warnings: LayoutWarning[] = []
  const contentWidth = layout.pageWidth - layout.safeX * 2

  // 孤行：同一 sourceBlock 跨页，且在后一页只出现 1 行
  const blockPageLines = new Map<string, Map<number, number>>()
  pages.forEach((page, pageIndex) => {
    for (const block of page.blocks) {
      if (block.type === 'image') continue
      const sourceId = block.sourceBlockId ?? block.id
      let pageMap = blockPageLines.get(sourceId)
      if (!pageMap) {
        pageMap = new Map()
        blockPageLines.set(sourceId, pageMap)
      }
      pageMap.set(pageIndex, (pageMap.get(pageIndex) ?? 0) + 1)
    }
  })

  for (const [sourceId, pageMap] of blockPageLines) {
    const pageIndexes = [...pageMap.keys()].sort((a, b) => a - b)
    if (pageIndexes.length < 2) continue
    for (const pageIndex of pageIndexes.slice(1)) {
      const linesOnPage = pageMap.get(pageIndex) ?? 0
      if (linesOnPage === 1) {
        warnings.push({
          code: 'orphan_line',
          message: `段落跨页后在第 ${pageIndex + 1} 页仅剩 1 行（孤行）`,
          pageIndex,
          blockId: sourceId,
        })
      }
    }
  }

  pages.forEach((page, pageIndex) => {
    for (const block of page.blocks) {
      if (block.type === 'image') continue
      const plain = stripHighlightMarkers(block.text)
      if (!plain) continue

      if (isPunctuationOnlyLine(plain)) {
        warnings.push({
          code: 'punctuation_only_line',
          message: `第 ${pageIndex + 1} 页存在独行标点：「${plain}」`,
          pageIndex,
          blockId: block.sourceBlockId ?? block.id,
          text: plain,
        })
      }

      const styleType = block.styleType ?? block.type
      const { fontFamily } = getFontConfigForStyleType(config, styleType)
      const fontSize =
        styleType === 'title'
          ? config.titleFontSize * layout.exportScale
          : styleType === 'heading'
            ? Math.round(config.headingFontSize * layout.exportScale)
            : styleType === 'code'
              ? Math.round(config.codeFontSize * layout.exportScale)
              : config.bodyFontSize * layout.exportScale
      const fontWeight = styleType === 'title' || styleType === 'heading' ? 700 : 400
      const inset =
        block.type === 'list'
          ? fontSize * 1.35
          : styleType === 'quote'
            ? fontSize * 0.55
            : styleType === 'code'
              ? fontSize * 0.72
              : 0
      const available = contentWidth - inset
      const width = measureLineWidth(plain, fontFamily, fontSize, fontWeight)
      if (width > available + 1) {
        warnings.push({
          code: 'line_overflow',
          message: `第 ${pageIndex + 1} 页单行溢出（${Math.ceil(width)}px > ${Math.floor(available)}px）`,
          pageIndex,
          blockId: block.sourceBlockId ?? block.id,
          text: plain.slice(0, 32),
        })
      }
    }
  })

  return { pageCount: pages.length, warnings }
}

export function summarizeMarkdownBlocks(
  blocks: MarkdownBlock[],
): { id: string; type: string; text: string; plainText: string }[] {
  return blocks.map((block) => ({
    id: block.id,
    type: block.type,
    text: block.text,
    plainText: stripHighlightMarkers(block.text),
  }))
}
