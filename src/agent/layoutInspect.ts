import { getGraphicLayout, paginateDocument } from '../features/graphic-text/layout'
import { stripHighlightMarkers } from '../features/graphic-text/inlineHighlight'
import { getFontConfigForStyleType } from '../features/graphic-text/graphicTextFonts'
import type { GraphicDocument } from '../features/graphic-text/document'
import type { GraphicTextConfig, MarkdownBlock } from '../features/graphic-text/types'
import type { LayoutWarning } from './protocol'

/** 独行标点：该行去除空白后仅含标点、无其它文字 */
const PUNCTUATION_ONLY_LINE =
  /^[\s。！？!?、，,；;：:…·．.\-—–…⋯~～《》〈〉「」『』【】（）()[\]"'“”‘’]+$/u

/** 标题行高超过该值视为过松 */
export const TITLE_LINE_HEIGHT_MAX = 1.12

/** 单篇文章高亮颜色种类上限 */
export const MAX_HIGHLIGHT_COLORS = 3

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

function collectHighlightColors(config: GraphicTextConfig): string[] {
  const colors = new Set<string>()
  for (const map of [
    config.underlineHighlightColors,
    config.brushHighlightColors,
    config.quoteHighlightColors,
    config.circleHighlightColors,
  ]) {
    for (const color of Object.values(map ?? {})) {
      if (color) colors.add(color.toUpperCase())
    }
  }
  return [...colors]
}

function titleSourceIds(pages: ReturnType<typeof paginateDocument>): string[] {
  const ids = new Set<string>()
  for (const page of pages) {
    for (const block of page.blocks) {
      if ((block.styleType ?? block.type) !== 'title') continue
      ids.add(block.sourceBlockId ?? block.id)
    }
  }
  return [...ids]
}

function contiguousCircleRuns(circleMap: Record<string, string>, titleId: string) {
  const indexes = Object.keys(circleMap)
    .filter((key) => key.startsWith(`${titleId}:`))
    .map((key) => Number(key.slice(titleId.length + 1)))
    .filter((index) => Number.isFinite(index))
    .sort((a, b) => a - b)

  const runs: { start: number; end: number }[] = []
  for (const index of indexes) {
    const last = runs[runs.length - 1]
    if (last && index === last.end) {
      last.end = index + 1
    } else {
      runs.push({ start: index, end: index + 1 })
    }
  }
  return runs
}

/**
 * 基于当前分页结果做异常检测：
 * - 单行溢出 / 孤行 / 独行标点
 * - 标题必须有至少一处画圈高亮
 * - 标题画圈词语不得跨行
 * - 全文高亮颜色不超过 3 种
 * - 标题行高不得过松
 */
export function inspectGraphicLayout(
  document: GraphicDocument,
  config: GraphicTextConfig,
): { pageCount: number; warnings: LayoutWarning[] } {
  const layout = getGraphicLayout(config)
  const pages = paginateDocument(document, config)
  const warnings: LayoutWarning[] = []
  const contentWidth = layout.pageWidth - layout.safeX * 2

  if (config.titleLineHeight > TITLE_LINE_HEIGHT_MAX) {
    warnings.push({
      code: 'title_line_height_loose',
      message: `标题行高过松（${config.titleLineHeight} > ${TITLE_LINE_HEIGHT_MAX}），显得松散难看`,
      pageIndex: 0,
    })
  }

  const colors = collectHighlightColors(config)
  if (colors.length > MAX_HIGHLIGHT_COLORS) {
    warnings.push({
      code: 'too_many_colors',
      message: `全文高亮颜色超过 ${MAX_HIGHLIGHT_COLORS} 种（当前 ${colors.length}：${colors.join(', ')}）`,
      pageIndex: 0,
    })
  }

  const titleIds = titleSourceIds(pages)
  const circleMap = config.circleHighlightColors ?? {}
  const titleHasCircle = titleIds.some((id) =>
    Object.keys(circleMap).some((key) => key.startsWith(`${id}:`)),
  )
  if (titleIds.length > 0 && !titleHasCircle) {
    warnings.push({
      code: 'title_missing_circle',
      message: '标题必须至少有一处画圈高亮',
      pageIndex: 0,
      blockId: titleIds[0],
    })
  }

  // 标题画圈 run 是否落在同一视觉行
  for (const titleId of titleIds) {
    const runs = contiguousCircleRuns(circleMap, titleId)
    for (const run of runs) {
      const lineKeys = new Set<string>()
      pages.forEach((page, pageIndex) => {
        for (const block of page.blocks) {
          if ((block.sourceBlockId ?? block.id) !== titleId) continue
          if ((block.styleType ?? block.type) !== 'title') continue
          const offset = block.charOffset ?? 0
          const plain = stripHighlightMarkers(block.text)
          const lineEnd = offset + [...plain].length
          const overlaps = run.start < lineEnd && run.end > offset
          if (overlaps) {
            lineKeys.add(`${pageIndex}:${offset}`)
          }
        }
      })
      if (lineKeys.size > 1) {
        warnings.push({
          code: 'title_circle_wrapped',
          message: `标题画圈词语跨行了（[${run.start},${run.end})），请调大/微调标题字号并收紧行高，避免圈词折行`,
          pageIndex: 0,
          blockId: titleId,
        })
      }
    }
  }

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
