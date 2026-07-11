import type { FontOption } from '../data/fonts'

const loadedFontIds = new Set<string>()

function fontUrl(file: string) {
  const base = import.meta.env.BASE_URL
  return `${base}fonts/pixel/${file}`
}

function buildPixelFontCss(displayFamily: string, zhFile: string, latinFile: string) {
  return `
@font-face {
  font-family: '${displayFamily}';
  src: url('${fontUrl(zhFile)}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: '${displayFamily}';
  src: url('${fontUrl(latinFile)}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
`.trim()
}

export async function ensurePixelFontLoaded(font: FontOption): Promise<boolean> {
  if (!font.pixelFamily || !font.pixelFiles) return false
  if (loadedFontIds.has(font.id)) return true

  try {
    const styleId = `pixel-font-${font.id}`
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = buildPixelFontCss(font.pixelFamily, font.pixelFiles.zh, font.pixelFiles.latin)
      document.head.appendChild(style)
    }

    const family = font.pixelFamily
    await document.fonts.load(`24px '${family}'`)
    await document.fonts.ready

    const hasChinese = document.fonts.check(`24px '${family}'`, '像素文字')
    const hasLatin = document.fonts.check(`24px '${family}'`, 'Pixel')
    if (!hasChinese && !hasLatin) return false

    loadedFontIds.add(font.id)
    await document.fonts.ready
    return true
  } catch {
    return false
  }
}

export function isPixelFontLoaded(fontId: string) {
  return loadedFontIds.has(fontId)
}

export function formatCanvasFont(
  fontFamily: string,
  fontStyle: string,
  fontWeight: number,
  fontSize: number,
) {
  const families = fontFamily
    .split(',')
    .map((part) => part.trim())
    .map((part) => {
      if (part.startsWith('"') || part.startsWith("'")) return part
      if (/^[a-zA-Z_][\w-]*$/.test(part)) return part
      return `'${part.replace(/'/g, "\\'")}'`
    })
    .join(', ')

  return `${fontStyle} ${fontWeight} ${fontSize}px ${families}`
}
