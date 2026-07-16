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
