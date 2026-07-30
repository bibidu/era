import { TEXT_FONT_OPTIONS } from '../../data/fonts'
import { TITLE_DISPLAY_WIDTH, TITLE_EXPORT_WIDTH, TITLE_SAFE_X } from './canvas'
import { lineText } from './model'
import type { TitleDocument } from './types'

export interface TitleConfigPayload {
  version: 1
  canvas: {
    displayWidth: number
    exportWidth: number
    safeX: number
    note: string
  }
  text: string
  lines: Array<{
    index: number
    text: string
    fontId: string
    fontLabel: string
    fontSize: number
    stretch: number
    color: string
    gapAfter: number
    charColors: Array<{ index: number; char: string; color: string }>
  }>
}

/** 安全区内容宽（display 单位）：整页宽减去左右 safeX */
export function titleContentWidthDisplay(): number {
  return TITLE_DISPLAY_WIDTH * (1 - (2 * TITLE_SAFE_X) / TITLE_EXPORT_WIDTH)
}

/** 粗估行宽（CJK≈方块字）；用于复制配置时提示是否会超出安全区 */
export function estimateLineWidthDisplay(line: {
  text: string
  fontSize: number
  stretch: number
}): number {
  return Array.from(line.text).length * line.fontSize * line.stretch
}

export function buildTitleConfigPayload(doc: TitleDocument): TitleConfigPayload {
  const contentWidth = titleContentWidthDisplay()
  return {
    version: 1,
    canvas: {
      displayWidth: TITLE_DISPLAY_WIDTH,
      exportWidth: TITLE_EXPORT_WIDTH,
      safeX: TITLE_SAFE_X,
      note: `fontSize/gapAfter 相对整页 displayWidth=${TITLE_DISPLAY_WIDTH}（不是安全区宽）；导出 ×${TITLE_EXPORT_WIDTH / TITLE_DISPLAY_WIDTH} 到 ${TITLE_EXPORT_WIDTH}。安全区内容宽≈${Math.round(contentWidth)}。字号勿按内容区缩放。`,
    },
    text: doc.lines.map(lineText).join('\n'),
    lines: doc.lines.map((line, index) => {
      const font = TEXT_FONT_OPTIONS.find((item) => item.id === line.fontId)
      const text = lineText(line)
      return {
        index,
        text,
        fontId: line.fontId,
        fontLabel: font?.label ?? line.fontId,
        fontSize: line.fontSize,
        stretch: line.stretch,
        color: line.color,
        gapAfter: line.gapAfter,
        charColors: line.chars
          .map((char, charIndex) =>
            char.color
              ? { index: charIndex, char: char.ch, color: char.color }
              : null,
          )
          .filter((item): item is { index: number; char: string; color: string } => item !== null),
      }
    }),
  }
}

/** 给人 / AI 直接读的配置文本 */
export function formatTitleConfigForClipboard(doc: TitleDocument): string {
  const payload = buildTitleConfigPayload(doc)
  const lines = payload.lines
    .map((line) => {
      const accents =
        line.charColors.length > 0
          ? `\n    charColors: ${line.charColors
              .map((c) => `${c.index}「${c.char}」=${c.color}`)
              .join(', ')}`
          : ''
      return [
        `  [${line.index}] ${JSON.stringify(line.text)}`,
        `    fontId: ${line.fontId} (${line.fontLabel})`,
        `    fontSize: ${line.fontSize}`,
        `    stretch: ${line.stretch}`,
        `    color: ${line.color}`,
        `    gapAfter: ${line.gapAfter}${accents}`,
      ].join('\n')
    })
    .join('\n')

  const contentWidth = titleContentWidthDisplay()
  const overflowHints = payload.lines
    .map((line) => {
      const est = estimateLineWidthDisplay(line)
      if (est <= contentWidth) return null
      return `  [!] line ${line.index} 粗估宽 ${Math.round(est)} > 安全区 ${Math.round(contentWidth)}（会超出右边）`
    })
    .filter(Boolean)

  return [
    '# 标题排版配置（请按此设置）',
    `canvas: exportWidth=${payload.canvas.exportWidth}, displayWidth=${payload.canvas.displayWidth}, safeX=${payload.canvas.safeX}, contentWidth≈${Math.round(contentWidth)}`,
    `note: ${payload.canvas.note}`,
    `text:`,
    payload.text
      .split('\n')
      .map((row) => `  ${row}`)
      .join('\n'),
    `lines:`,
    lines,
    ...(overflowHints.length
      ? ['overflowWarnings:', ...overflowHints]
      : ['overflowWarnings: none']),
    '',
    '# JSON',
    JSON.stringify(payload, null, 2),
  ].join('\n')
}
