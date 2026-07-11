import { useCallback, useState } from 'react'
import type { FontOption } from '../data/fonts'
import { ensureFontReady, isRemoteFontLoaded } from '../utils/fontLoad'
import { isPixelFontLoaded } from '../utils/pixelFont'

const loadedFontIds = new Set<string>([
  'system', 'pingfang', 'yahei',
])

export function useFontLoader() {
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(() => new Set(loadedFontIds))
  const [loadingFonts, setLoadingFonts] = useState<Set<string>>(() => new Set())

  const isFontLoaded = useCallback(
    (font: FontOption) => {
      if (font.source === 'system') return true
      return loadedFonts.has(font.id) || isPixelFontLoaded(font.id) || isRemoteFontLoaded(font.id)
    },
    [loadedFonts],
  )

  const loadFont = useCallback(async (font: FontOption, sampleText?: string): Promise<boolean> => {
    if (font.source === 'system') return true

    if (isFontLoaded(font) && font.source === 'cdn') {
      return ensureFontReady(font, sampleText ?? font.sample)
    }

    if (isFontLoaded(font)) return true
    if (loadingFonts.has(font.id)) return false

    setLoadingFonts((prev) => new Set(prev).add(font.id))

    try {
      const ok = await ensureFontReady(font, sampleText ?? font.sample)
      if (!ok) return false

      loadedFontIds.add(font.id)
      setLoadedFonts((prev) => new Set(prev).add(font.id))
      return true
    } catch {
      return false
    } finally {
      setLoadingFonts((prev) => {
        const next = new Set(prev)
        next.delete(font.id)
        return next
      })
    }
  }, [isFontLoaded, loadingFonts])

  return { loadedFonts, loadingFonts, isFontLoaded, loadFont }
}
