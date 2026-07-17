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

/** 单页高亮片段上限（极个别可放宽，默认检测按此阈值） */
export const MAX_HIGHLIGHTS_PER_PAGE = 4

function highlightMaps(config: GraphicTextConfig) {
  return [
    config.underlineHighlightColors ?? {},
    config.brushHighlightColors ?? {},
    config.quoteHighlightColors ?? {},
    config.circleHighlightColors ?? {},
  ]
}

function charHasHighlight(config: GraphicTextConfig, blockId: string, charIndex: number) {
  const key = `${blockId}:${charIndex}`
  return highlightMaps(config).some((map) => Boolean(map[key]))
}

/**
 * 统计每页「高亮片段」数量：同一 sourceBlock 内连续被高亮的字符算 1 处；
 * 跨 style（brush/underline 叠加同一字符）仍只算一次连续片段。
 */
function countHighlightRunsPerPage(
  pages: ReturnType<typeof paginateDocument>,
  config: GraphicTextConfig,
): number[] {
  return pages.map((page) => {
    let runs = 0
    const bySource = new Map<string, { offset: number; text: string }[]>()
    for (const block of page.blocks) {
      if (block.type === 'image') continue
      const sourceId = block.sourceBlockId ?? block.id
      const offset = block.charOffset ?? 0
      const text = stripHighlightMarkers(block.text)
      const list = bySource.get(sourceId) ?? []
      list.push({ offset, text })
      bySource.set(sourceId, list)
    }

    for (const [sourceId, lines] of bySource) {
      const covered = new Set<number>()
      for (const line of lines) {
        const chars = [...line.text]
        for (let i = 0; i < chars.length; i += 1) {
          const index = line.offset + i
          if (charHasHighlight(config, sourceId, index)) covered.add(index)
        }
      }
      const indexes = [...covered].sort((a, b) => a - b)
      if (!indexes.length) continue
      runs += 1
      for (let i = 1; i < indexes.length; i += 1) {
        if (indexes[i] !== indexes[i - 1] + 1) runs += 1
      }
    }
    return runs
  })
}

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

function parseCircleKey(key: string): { blockId: string; index: number } | null {
  const lastColon = key.lastIndexOf(':')
  if (lastColon <= 0) return null
  const blockId = key.slice(0, lastColon)
  const index = Number(key.slice(lastColon + 1))
  if (!blockId || !Number.isFinite(index)) return null
  return { blockId, index }
}

/** 将同一 block 内连续的画圈字符合并为 run（[start, end)） */
function contiguousCircleRunsByBlock(circleMap: Record<string, string>) {
  const byBlock = new Map<string, number[]>()
  for (const key of Object.keys(circleMap)) {
    const parsed = parseCircleKey(key)
    if (!parsed) continue
    const list = byBlock.get(parsed.blockId) ?? []
    list.push(parsed.index)
    byBlock.set(parsed.blockId, list)
  }

  const result: { blockId: string; start: number; end: number }[] = []
  for (const [blockId, indexes] of byBlock) {
    indexes.sort((a, b) => a - b)
    let start = indexes[0]
    let end = indexes[0] + 1
    for (let i = 1; i < indexes.length; i += 1) {
      const index = indexes[i]
      if (index === end) {
        end = index + 1
      } else {
        result.push({ blockId, start, end })
        start = index
        end = index + 1
      }
    }
    result.push({ blockId, start, end })
  }
  return result
}

/**
 * 画圈词语不得跨视觉行：run 内每个字符必须落在同一 layout line。
 */
function collectCircleWrapWarnings(
  pages: ReturnType<typeof paginateDocument>,
  circleMap: Record<string, string>,
): LayoutWarning[] {
  const warnings: LayoutWarning[] = []
  const runs = contiguousCircleRunsByBlock(circleMap)

  for (const run of runs) {
    // charIndex -> lineKey
    const lineByChar = new Map<number, string>()
    pages.forEach((page, pageIndex) => {
      page.blocks.forEach((block, lineIndex) => {
        if (block.type === 'image') return
        const sourceId = block.sourceBlockId ?? block.id
        if (sourceId !== run.blockId) return
        const offset = block.charOffset ?? 0
        const plain = stripHighlightMarkers(block.text)
        const length = [...plain].length
        const lineKey = `${pageIndex}:${lineIndex}:${offset}`
        for (let index = run.start; index < run.end; index += 1) {
          if (index >= offset && index < offset + length) {
            lineByChar.set(index, lineKey)
          }
        }
      })
    })

    const covered = [...lineByChar.keys()].sort((a, b) => a - b)
    if (covered.length < run.end - run.start) {
      warnings.push({
        code: 'circle_wrapped',
        message: `画圈词语未能完整落在可视行内（block ${run.blockId} [${run.start},${run.end})）`,
        pageIndex: 0,
        blockId: run.blockId,
      })
      continue
    }

    const lineKeys = new Set(lineByChar.values())
    if (lineKeys.size > 1) {
      const pageIndex = Number([...lineKeys][0]?.split(':')[0] ?? 0)
      warnings.push({
        code: 'circle_wrapped',
        message: `画圈词语跨行了（${run.blockId} [${run.start},${run.end})），请调整字号/换行，保证圈词在同一行`,
        pageIndex,
        blockId: run.blockId,
      })
      if (run.blockId.includes('::title')) {
        warnings.push({
          code: 'title_circle_wrapped',
          message: `标题画圈词语跨行了（[${run.start},${run.end})），请微调标题字号并收紧行高`,
          pageIndex: 0,
          blockId: run.blockId,
        })
      }
    }
  }

  return warnings
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
  if (colors.length === MAX_HIGHLIGHT_COLORS) {
    const hasGray = colors.some((color) => {
      const value = color.toUpperCase()
      return (
        value === '#525252' ||
        value === '#737373' ||
        value === '#404040' ||
        value === '#666666' ||
        value === '#6B7280'
      )
    })
    if (!hasGray) {
      warnings.push({
        code: 'too_many_colors',
        message: `使用满 ${MAX_HIGHLIGHT_COLORS} 种高亮色时必须包含明确灰色（推荐 #525252 / #737373；当前：${colors.join(', ')}）`,
        pageIndex: 0,
      })
    }
  }

  const runsPerPage = countHighlightRunsPerPage(pages, config)
  runsPerPage.forEach((count, pageIndex) => {
    if (count > MAX_HIGHLIGHTS_PER_PAGE) {
      warnings.push({
        code: 'too_many_highlights_per_page',
        message: `第 ${pageIndex + 1} 页高亮 ${count} 处，超过上限 ${MAX_HIGHLIGHTS_PER_PAGE}（极个别页才可放宽）`,
        pageIndex,
      })
    }
  })

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

  // 画圈词语不得跨行（全文所有 circle，含标题）
  warnings.push(...collectCircleWrapWarnings(pages, circleMap))

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
