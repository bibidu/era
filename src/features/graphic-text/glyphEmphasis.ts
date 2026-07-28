/** 标题等逐字强调：数黑体 + 各向异性 scale；可含字号 / 占位宽 / 颜色 */

export interface GlyphEmphasisStyle {
  fontFamily: string
  scaleX: number
  scaleY: number
  /** 设计坐标字号（相对 GRAPHIC_DISPLAY_BASE_WIDTH=360） */
  fontSize?: number
  /** 占位宽（em，相对该字 fontSize）；有值时按 TitleAdjust 槽宽排版 */
  widthEm?: number
  /** 文字色；优先于默认色 */
  color?: string
}

export const DEFAULT_GLYPH_EMPHASIS: GlyphEmphasisStyle = {
  fontFamily: '"Alimama ShuHeiTi", sans-serif',
  scaleX: 0.7,
  /** 纵向拉高，需一眼能看出变高 */
  scaleY: 1.65,
}

/** 强调字两侧额外空隙（相对字号）；仅在无 widthEm 时使用 */
export const GLYPH_EMPHASIS_SIDE_GAP_RATIO = 0.28

/**
 * 序列化：fontFamily||scaleX||scaleY[||fontSize||widthEm||color]
 * 后三段可选；空字符串表示未设置。
 */
export function encodeGlyphEmphasis(style: GlyphEmphasisStyle): string {
  const base = `${style.fontFamily}||${style.scaleX}||${style.scaleY}`
  const hasExtra =
    style.fontSize != null || style.widthEm != null || Boolean(style.color)
  if (!hasExtra) return base
  return `${base}||${style.fontSize ?? ''}||${style.widthEm ?? ''}||${style.color ?? ''}`
}

export function parseGlyphEmphasis(raw: string | undefined | null): GlyphEmphasisStyle | null {
  if (!raw) return null
  const parts = raw.split('||')
  if (parts.length < 3) return null
  const fontFamily = parts[0]?.trim()
  const scaleX = Number(parts[1])
  const scaleY = Number(parts[2])
  if (!fontFamily || !Number.isFinite(scaleX) || !Number.isFinite(scaleY)) return null
  const fontSizeRaw = parts[3]
  const widthEmRaw = parts[4]
  const colorRaw = parts[5]?.trim()
  const fontSize =
    fontSizeRaw !== undefined && fontSizeRaw !== '' ? Number(fontSizeRaw) : undefined
  const widthEm =
    widthEmRaw !== undefined && widthEmRaw !== '' ? Number(widthEmRaw) : undefined
  return {
    fontFamily,
    scaleX,
    scaleY,
    ...(fontSize != null && Number.isFinite(fontSize) ? { fontSize } : null),
    ...(widthEm != null && Number.isFinite(widthEm) ? { widthEm } : null),
    ...(colorRaw ? { color: colorRaw } : null),
  }
}

/** 强调字在导出/测量时的实际字号（px） */
export function resolveGlyphSizePx(
  emphasis: GlyphEmphasisStyle | null,
  lineFontSizePx: number,
  exportScale: number,
) {
  if (emphasis?.fontSize != null && Number.isFinite(emphasis.fontSize)) {
    return emphasis.fontSize * exportScale
  }
  return lineFontSizePx
}

/** 单字占位前进宽度 */
export function measureEmphasisAdvance(
  naturalWidth: number,
  emphasis: GlyphEmphasisStyle,
  sizePx: number,
) {
  if (emphasis.widthEm != null && Number.isFinite(emphasis.widthEm)) {
    return emphasis.widthEm * sizePx
  }
  const visual = naturalWidth * emphasis.scaleX
  const sideGap = sizePx * GLYPH_EMPHASIS_SIDE_GAP_RATIO
  return visual + sideGap * 2
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
