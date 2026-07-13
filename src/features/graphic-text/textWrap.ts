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
