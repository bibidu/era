import { useEffect, useState } from 'react'
import {
  applyTheme,
  prefersSafariToolbarReload,
  readStoredTheme,
  toggleTheme,
  type EraTheme,
} from './theme'

export function useEraTheme() {
  const [theme, setTheme] = useState<EraTheme>(() => {
    if (typeof window === 'undefined') {
      return 'dark'
    }
    return readStoredTheme()
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return {
    theme,
    setTheme,
    toggle: () => {
      const next = toggleTheme(theme)
      applyTheme(next)
      // Safari 26+ only samples toolbar tint at first paint; reload so top chrome matches.
      if (prefersSafariToolbarReload()) {
        window.location.reload()
        return
      }
      setTheme(next)
    },
  }
}
