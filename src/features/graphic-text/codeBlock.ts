export const CODE_FONT_FAMILY =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'

export const CODE_BACKGROUND = '#EDEAE3'
export const CODE_SIZE_SCALE = 0.92
export const CODE_HORIZONTAL_PADDING_SCALE = 0.5
export const CODE_VERTICAL_PADDING_SCALE = 0.22

/** 代码块按既有换行拆分，超长行再按等宽字符数折行 */
export function wrapCodeTextLines(text: string, charsPerLine: number): string[] {
  const logicalLines = text.split('\n')
  const wrapped: string[] = []

  for (const line of logicalLines) {
    if (line.length <= charsPerLine) {
      wrapped.push(line)
      continue
    }
    for (let index = 0; index < line.length; index += charsPerLine) {
      wrapped.push(line.slice(index, index + charsPerLine))
    }
  }

  return wrapped.length ? wrapped : ['']
}

export function codeCharsPerLine(availableWidth: number, fontSize: number) {
  const charWidth = fontSize * 0.58
  return Math.max(4, Math.floor(availableWidth / charWidth))
}
