import { GITHUB_CODE_FONT, prefixChineseCodeLine } from './codeHighlight'

export const CODE_FONT_FAMILY = GITHUB_CODE_FONT
export const CODE_BACKGROUND = '#0a0a0a'
export const CODE_BORDER_COLOR = 'rgba(255,255,255,0.06)'
export const CODE_TEXT_COLOR = '#fafafa'
export const CODE_CHROME_BG = '#1a1a1a'
export const CODE_CHROME_HEIGHT = 40
export const CODE_CHROME_TITLE_COLOR = '#71717a'
export const CODE_CHROME_TITLE_SIZE = 13
export const CODE_RADIUS = 12
export const CODE_BODY_PAD = 20
export const CODE_AFTER_GAP = 36
export const CODE_DOTS = ['#ff5f57', '#febc2e', '#28c840'] as const
export const CODE_DOT_SIZE = 12
export const CODE_DOT_OPACITY = 0.85
export const CODE_SHADOW = '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)'
export const CODE_CHROME_PAD_X = 16
export const CODE_CHROME_GAP = 8
export const CODE_CHROME_BORDER = '1px solid rgba(255,255,255,0.06)'
export const CODE_DEFAULT_TITLE = 'prompt'
export const CODE_HORIZONTAL_PADDING_SCALE = 0.95
export const CODE_VERTICAL_PADDING_SCALE = 0.6
export const CODE_BORDER_WIDTH_PX = 1
/** Remocn tokens are designed for a ~1080-wide frame. 40px chrome stays 40px on 1080 export. */
export const CODE_REF_WIDTH = 1080

export function codePx(pageWidth: number, px: number) {
  return px * (pageWidth / CODE_REF_WIDTH)
}

export function codeTokenCqw(px: number) {
  return `${(px / CODE_REF_WIDTH) * 100}cqw`
}

export function codeBlockShadowCss(cqw: (px: number) => string) {
  return `0 ${cqw(30)} ${cqw(80)} rgba(0,0,0,0.6), 0 0 0 ${cqw(1)} rgba(255,255,255,0.06)`
}

export function resolveCodeBlockTitle(fenceInfo?: string | null): string {
  const info = fenceInfo?.trim()
  return info || CODE_DEFAULT_TITLE
}

/** Chrome bar + equal body pad (top and bottom). Used by pagination and export. */
export function codeWindowExtraHeight(pageWidth: number): number {
  return codePx(pageWidth, CODE_CHROME_HEIGHT + CODE_BODY_PAD * 2)
}

export function codeBodyPadPx(pageWidth: number): number {
  return codePx(pageWidth, CODE_BODY_PAD)
}

export function measureCodeTextWidth(text: string, fontSize: number, fontFamily = CODE_FONT_FAMILY): number {
  if (!text) return 0
  if (typeof document === 'undefined') return text.length * fontSize * 0.6

  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return text.length * fontSize * 0.6

  ctx.font = `400 ${fontSize}px ${fontFamily}`
  return ctx.measureText(text).width
}

export function estimateCodeLineWidth(fontSize: number, availableWidth: number) {
  return Math.max(fontSize * 2.4, availableWidth)
}

/** 代码块按原始换行拆分，超长行在空白处折行，仅在单词过长时硬切。
 * 中文行先补 `// ` 再量宽；`// ` 行折行后的续行保持同一缩进 + `// `。 */
export function wrapCodeTextLines(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily = CODE_FONT_FAMILY,
): string[] {
  const logicalLines = text.split('\n').map(prefixChineseCodeLine)
  const wrapped: string[] = []

  const fits = (value: string, limit = maxWidth) =>
    measureCodeTextWidth(value, fontSize, fontFamily) <= limit

  const pushHardBrokenToken = (token: string, bucket: string[], limit: number) => {
    let rest = token
    while (rest) {
      if (fits(rest, limit)) {
        bucket.push(rest)
        return
      }
      let low = 1
      let high = rest.length
      while (low < high) {
        const mid = Math.ceil((low + high) / 2)
        if (measureCodeTextWidth(rest.slice(0, mid), fontSize, fontFamily) <= limit) {
          low = mid
        } else {
          high = mid - 1
        }
      }
      const take = Math.max(1, low)
      bucket.push(rest.slice(0, take))
      rest = rest.slice(take)
    }
  }

  const wrapOneLine = (line: string, limit: number, bucket: string[]) => {
    if (!line) {
      bucket.push('')
      return
    }
    if (fits(line, limit)) {
      bucket.push(line)
      return
    }

    const words = line.match(/\S+/g) ?? []
    let current = ''

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (fits(candidate, limit)) {
        current = candidate
        continue
      }

      if (current) {
        bucket.push(current)
        current = ''
      }

      if (fits(word, limit)) {
        current = word
      } else {
        pushHardBrokenToken(word, bucket, limit)
      }
    }

    if (current) bucket.push(current)
  }

  for (const line of logicalLines) {
    if (!line) {
      wrapped.push('')
      continue
    }

    const commentMatch = line.match(/^(\s*)(\/\/ )/)
    if (commentMatch) {
      const prefix = `${commentMatch[1]}${commentMatch[2]}`
      const rest = line.slice(prefix.length)
      if (!rest || fits(line)) {
        wrapped.push(line)
        continue
      }
      const prefixWidth = measureCodeTextWidth(prefix, fontSize, fontFamily)
      const innerMax = Math.max(fontSize * 2, maxWidth - prefixWidth)
      const inner: string[] = []
      wrapOneLine(rest, innerMax, inner)
      for (const part of inner) wrapped.push(prefix + part)
      continue
    }

    wrapOneLine(line, maxWidth, wrapped)
  }

  return wrapped.length ? wrapped : ['']
}
