/** 将文本拆成换行单元：英文单词保持完整，中文/标点按字符 */
export function splitWrapUnits(text: string): string[] {
  const units: string[] = []
  let index = 0

  while (index < text.length) {
    const char = text[index]
    if (/[A-Za-z]/.test(char)) {
      let end = index + 1
      while (end < text.length && /[A-Za-z0-9'-]/.test(text[end])) end += 1
      units.push(text.slice(index, end))
      index = end
    } else {
      units.push(char)
      index += 1
    }
  }

  return units
}

function unitWidthCost(unit: string): number {
  if (/^[A-Za-z0-9'-]+$/.test(unit)) return unit.length * 0.55
  return 1
}

/** 基于 Canvas 度量估算每行可容纳的字符成本单位 */
export function estimateCharsPerLine(
  fontFamily: string,
  fontSize: number,
  fontWeight: number,
  availableWidth: number,
): number {
  const fallback = Math.max(4, Math.floor(availableWidth / (fontSize * 0.95)))
  if (typeof document === 'undefined') return fallback

  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return fallback

  const primary = fontFamily.replace(/"/g, '').split(',')[0].trim()
  ctx.font = `${fontWeight} ${fontSize}px ${primary}`
  const charWidth = ctx.measureText('汉').width
  if (!charWidth) return fallback
  return Math.max(4, Math.floor(availableWidth / charWidth))
}

export function wrapPlainTextLines(text: string, charsPerLine: number): string[] {
  const units = splitWrapUnits(text)
  if (!units.length) return ['']

  const lines: string[] = []
  let current = ''
  let currentCost = 0

  for (const unit of units) {
    const cost = unitWidthCost(unit)
    if (current && currentCost + cost > charsPerLine) {
      lines.push(current)
      current = unit
      currentCost = cost
    } else {
      current += unit
      currentCost += cost
    }
  }

  if (current) lines.push(current)
  return lines
}
