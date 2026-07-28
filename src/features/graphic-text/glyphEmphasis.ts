/** 标题等逐字强调：数黑体 + 各向异性 scale */

export interface GlyphEmphasisStyle {
  fontFamily: string
  scaleX: number
  scaleY: number
}

export const DEFAULT_GLYPH_EMPHASIS: GlyphEmphasisStyle = {
  fontFamily: '"Alimama ShuHeiTi", sans-serif',
  scaleX: 0.72,
  scaleY: 1.15,
}

/** 序列化：fontFamily||scaleX||scaleY */
export function encodeGlyphEmphasis(style: GlyphEmphasisStyle): string {
  return `${style.fontFamily}||${style.scaleX}||${style.scaleY}`
}

export function parseGlyphEmphasis(raw: string | undefined | null): GlyphEmphasisStyle | null {
  if (!raw) return null
  const parts = raw.split('||')
  if (parts.length < 3) return null
  const fontFamily = parts[0]?.trim()
  const scaleX = Number(parts[1])
  const scaleY = Number(parts[2])
  if (!fontFamily || !Number.isFinite(scaleX) || !Number.isFinite(scaleY)) return null
  return { fontFamily, scaleX, scaleY }
}

/** 标题强制换行标记（不计入高亮字符下标） */
export function stripTitleBreakMarkers(text: string) {
  return text.replace(/\|/g, '').replace(/\n/g, '')
}

export function titlePlainText(text: string) {
  return stripTitleBreakMarkers(
    text.replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1'),
  )
}

export function glyphEmphasisKey(blockId: string, index: number) {
  return `${blockId}:${index}`
}
