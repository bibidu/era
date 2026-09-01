import { LATIN_FONT_FAMILY, cjkFontFamily } from './graphicTextFonts'

export function splitLatinRuns(text: string): Array<{ text: string; latin: boolean }> {
  const runs: Array<{ text: string; latin: boolean }> = []
  const re = /[\x00-\x7F]+/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) runs.push({ text: text.slice(last, match.index), latin: false })
    runs.push({ text: match[0], latin: true })
    last = match.index + match[0].length
  }
  if (last < text.length) runs.push({ text: text.slice(last), latin: false })
  return runs
}

function familyForRun(fontFamily: string, latin: boolean) {
  if (latin) return fontFamily.split(',')[0].trim() || LATIN_FONT_FAMILY
  return cjkFontFamily(fontFamily)
}

export function setMixedFont(
  ctx: CanvasRenderingContext2D,
  weight: number | string,
  size: number,
  fontFamily: string,
  latin: boolean,
) {
  ctx.font = `${weight} ${size}px ${familyForRun(fontFamily, latin)}`
}

export function measureMixedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number | string,
  size: number,
  fontFamily: string,
) {
  if (!text) return 0
  let width = 0
  for (const run of splitLatinRuns(text)) {
    setMixedFont(ctx, weight, size, fontFamily, run.latin)
    width += ctx.measureText(run.text).width
  }
  return width
}

export function fillMixedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  weight: number | string,
  size: number,
  fontFamily: string,
) {
  let cursor = x
  for (const run of splitLatinRuns(text)) {
    setMixedFont(ctx, weight, size, fontFamily, run.latin)
    ctx.fillText(run.text, cursor, y)
    cursor += ctx.measureText(run.text).width
  }
  return cursor - x
}
