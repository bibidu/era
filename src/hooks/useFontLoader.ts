import { useCallback, useState } from 'react'
import type { FontOption } from '../data/fonts'
import { ensureFontReady, isFontLoaded as isFontLoadedGlobal } from '../utils/fontLoad'

export function useFontLoader() {
  const [loadedRevision, setLoadedRevision] = useState(0)
  const [loadingFonts, setLoadingFonts] = useState<Set<string>>(() => new Set())

  const isFontLoaded = useCallback(
    (font: FontOption) => {
      void loadedRevision
      return isFontLoadedGlobal(font)
    },
    [loadedRevision],
  )

  const loadFont = useCallback(async (font: FontOption, sampleText?: string): Promise<boolean> => {
    if (font.source === 'system') return true

    if (isFontLoadedGlobal(font) && font.source === 'cdn') {
      return ensureFontReady(font, sampleText ?? font.sample)
    }

    if (isFontLoadedGlobal(font)) return true

    setLoadingFonts((prev) => new Set(prev).add(font.id))

    try {
      const ok = await ensureFontReady(font, sampleText ?? font.sample)
      if (ok) setLoadedRevision((n) => n + 1)
      return ok
    } catch {
      return false
    } finally {
      setLoadingFonts((prev) => {
        const next = new Set(prev)
        next.delete(font.id)
        return next
      })
    }
  }, [])

  return { loadingFonts, isFontLoaded, loadFont }
}
