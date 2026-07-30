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

export function buildTitleConfigPayload(doc: TitleDocument): TitleConfigPayload {
  return {
    version: 1,
    canvas: {
      displayWidth: TITLE_DISPLAY_WIDTH,
      exportWidth: TITLE_EXPORT_WIDTH,
      safeX: TITLE_SAFE_X,
      note: 'fontSize/gapAfter 单位与图文一致（相对 displayWidth=360）；导出时 ×3 到 1080',
    },
    text: doc.lines.map(lineText).join('\n'),
    lines: doc.lines.map((line, index) => {
      const font = TEXT_FONT_OPTIONS.find((item) => item.id === line.fontId)
      return {
        index,
        text: lineText(line),
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

  return [
    '# 标题排版配置（请按此设置）',
    `canvas: exportWidth=${payload.canvas.exportWidth}, displayWidth=${payload.canvas.displayWidth}, safeX=${payload.canvas.safeX}`,
    `text:`,
    payload.text
      .split('\n')
      .map((row) => `  ${row}`)
      .join('\n'),
    `lines:`,
    lines,
    '',
    '# JSON',
    JSON.stringify(payload, null, 2),
  ].join('\n')
}
