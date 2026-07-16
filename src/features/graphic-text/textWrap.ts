/** 将文本拆成换行单元：英文单词保持完整，连续中文作为一组，其余按字符 */
const CJK_CHAR_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/

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
    } else if (CJK_CHAR_PATTERN.test(char)) {
      let end = index + 1
      while (end < text.length && CJK_CHAR_PATTERN.test(text[end])) end += 1
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
  return [...unit].length
}

function resolvePrimaryFontFamily(fontFamily: string) {
  return fontFamily.replace(/"/g, '').split(',')[0].trim()
}

function createMeasureContext(fontFamily: string, fontSize: number, fontWeight: number) {
  if (typeof document === 'undefined') return null

  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return null

  ctx.font = `${fontWeight} ${fontSize}px ${resolvePrimaryFontFamily(fontFamily)}`
  return ctx
}

function measureTextWidth(ctx: CanvasRenderingContext2D, text: string) {
  return ctx.measureText(text).width
}

function splitUnitToFit(
  unit: string,
  ctx: CanvasRenderingContext2D,
  maxWidth: number,
): string[] {
  if (!unit || measureTextWidth(ctx, unit) <= maxWidth) return [unit]

  const parts: string[] = []
  let current = ''

  for (const char of [...unit]) {
    const next = current + char
    if (current && measureTextWidth(ctx, next) > maxWidth) {
      parts.push(current)
      current = char
    } else {
      current = next
    }
  }

  if (current) parts.push(current)
  return parts.length ? parts : ['']
}

/** 基于 Canvas 度量估算每行可容纳的字符成本单位 */
export function estimateCharsPerLine(
  fontFamily: string,
  fontSize: number,
  fontWeight: number,
  availableWidth: number,
): number {
  const fallback = Math.max(4, Math.floor(availableWidth / (fontSize * 0.95)))
  const ctx = createMeasureContext(fontFamily, fontSize, fontWeight)
  if (!ctx) return fallback

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

export function wrapPlainTextLinesByWidth(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: number,
  maxWidth: number,
): string[] {
  if (!text) return ['']
  if (maxWidth <= 0) return [text]

  const ctx = createMeasureContext(fontFamily, fontSize, fontWeight)
  if (!ctx) {
    return wrapPlainTextLines(
      text,
      estimateCharsPerLine(fontFamily, fontSize, fontWeight, maxWidth),
    )
  }

  const units = splitWrapUnits(text)
  const lines: string[] = []
  let current = ''

  const flush = () => {
    if (!current) return
    lines.push(current)
    current = ''
  }

  for (const unit of units) {
    const pieces = splitUnitToFit(unit, ctx, maxWidth)

    for (const piece of pieces) {
      const candidate = current + piece
      if (current && measureTextWidth(ctx, candidate) > maxWidth) {
        flush()
        current = piece
      } else {
        current = candidate
      }
    }
  }

  flush()
  return lines.length ? lines : ['']
}
