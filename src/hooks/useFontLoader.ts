import { useCallback, useState } from 'react'
import type { FontOption } from '../data/fonts'
import { ensurePixelFontLoaded, isPixelFontLoaded } from '../utils/pixelFont'

const loadedFontIds = new Set<string>([
  'system', 'noto', 'song', 'kai', 'mono', 'courier',
  'pingfang', 'yahei', 'heiti', 'fangsong', 'arial', 'helvetica',
  'georgia', 'times', 'verdana',
])

export function useFontLoader() {
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(() => new Set(loadedFontIds))
  const [loadingFonts, setLoadingFonts] = useState<Set<string>>(() => new Set())

  const isFontLoaded = useCallback(
    (font: FontOption) => {
      if (font.source === 'system') return true
      return loadedFonts.has(font.id) || isPixelFontLoaded(font.id)
    },
    [loadedFonts],
  )

  const loadFont = useCallback(async (font: FontOption): Promise<boolean> => {
    if (font.source === 'system' || isFontLoaded(font)) return true
    if (loadingFonts.has(font.id)) return false

    setLoadingFonts((prev) => new Set(prev).add(font.id))

    try {
      if (font.source === 'pixel') {
        const ok = await ensurePixelFontLoaded(font)
        if (!ok) return false
      } else if (font.source === 'google' && font.googleFamily) {
        const href = `https://fonts.googleapis.com/css2?family=${font.googleFamily}&display=swap`
        const existing = document.querySelector(`link[data-font-id="${font.id}"]`)
        if (!existing) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = href
          link.dataset.fontId = font.id
          document.head.appendChild(link)
          await new Promise<void>((resolve, reject) => {
            link.onload = () => resolve()
            link.onerror = () => reject(new Error('font load failed'))
          })
        }

        const family = font.fontFamily.replace(/"/g, '').split(',')[0].trim()
        await document.fonts.load(`16px ${family}`)
        await document.fonts.ready
      } else {
        return false
      }

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
