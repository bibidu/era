import type { FontOption } from '../data/fonts'

const loadedFaceKeys = new Set<string>()

export async function ensurePixelFontLoaded(font: FontOption): Promise<boolean> {
  if (!font.fontFaces?.length) return false

  try {
    for (const face of font.fontFaces) {
      const faceKey = `${font.id}:${face.family}`
      if (loadedFaceKeys.has(faceKey)) continue

      const fontFace = new FontFace(face.family, `url(${face.url})`, {
        weight: '400',
        style: 'normal',
        display: 'swap',
      })
      await fontFace.load()
      document.fonts.add(fontFace)
      loadedFaceKeys.add(faceKey)
    }

    await Promise.all(
      font.fontFaces.map((face) => document.fonts.load(`24px ${face.family}`)),
    )
    await document.fonts.ready
    return true
  } catch {
    return false
  }
}

export function markPixelFontLoaded(font: FontOption) {
  font.fontFaces?.forEach((face) => {
    loadedFaceKeys.add(`${font.id}:${face.family}`)
  })
}
