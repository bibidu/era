export const CODE_FONT_FAMILY =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'

export const CODE_BACKGROUND = '#F2F2F2'
export const CODE_BORDER_COLOR = '#D1D5DB'
export const CODE_TEXT_COLOR = '#404040'
export const CODE_HORIZONTAL_PADDING_SCALE = 0.95
export const CODE_VERTICAL_PADDING_SCALE = 0.6
export const CODE_BORDER_WIDTH_PX = 1

function primaryFontFamily(fontFamily: string) {
  return fontFamily.replace(/"/g, '').split(',')[0].trim()
}

export function measureCodeTextWidth(text: string, fontSize: number, fontFamily = CODE_FONT_FAMILY): number {
  if (!text) return 0
  if (typeof document === 'undefined') return text.length * fontSize * 0.6

  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return text.length * fontSize * 0.6

  ctx.font = `400 ${fontSize}px ${primaryFontFamily(fontFamily)}`
  return ctx.measureText(text).width
}

export function estimateCodeLineWidth(fontSize: number, availableWidth: number) {
  return Math.max(fontSize * 2.4, availableWidth)
}

/** 代码块按原始换行拆分，超长行在空白处折行，仅在单词过长时硬切 */
export function wrapCodeTextLines(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily = CODE_FONT_FAMILY,
): string[] {
  const logicalLines = text.split('\n')
  const wrapped: string[] = []

  const fits = (value: string) => measureCodeTextWidth(value, fontSize, fontFamily) <= maxWidth

  const pushHardBrokenToken = (token: string) => {
    let rest = token
    while (rest) {
      if (fits(rest)) {
        wrapped.push(rest)
        return
      }
      let low = 1
      let high = rest.length
      while (low < high) {
        const mid = Math.ceil((low + high) / 2)
        if (measureCodeTextWidth(rest.slice(0, mid), fontSize, fontFamily) <= maxWidth) {
          low = mid
        } else {
          high = mid - 1
        }
      }
      const take = Math.max(1, low)
      wrapped.push(rest.slice(0, take))
      rest = rest.slice(take)
    }
  }

  for (const line of logicalLines) {
    if (!line) {
      wrapped.push('')
      continue
    }

    if (fits(line)) {
      wrapped.push(line)
      continue
    }

    const words = line.match(/\S+/g) ?? []
    let current = ''

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (fits(candidate)) {
        current = candidate
        continue
      }

      if (current) {
        wrapped.push(current)
        current = ''
      }

      if (fits(word)) {
        current = word
      } else {
        pushHardBrokenToken(word)
      }
    }

    if (current) wrapped.push(current)
  }

  return wrapped.length ? wrapped : ['']
}
