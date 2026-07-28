import { useEffect, useState } from 'react'
import { applyTheme, readStoredTheme, toggleTheme, type EraTheme } from './theme'

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
    toggle: () => setTheme((current) => toggleTheme(current)),
  }
}
