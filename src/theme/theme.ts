export type EraTheme = 'dark' | 'light'

export const ERA_THEME_STORAGE_KEY = 'era-theme'

export function readStoredTheme(): EraTheme {
  try {
    const value = localStorage.getItem(ERA_THEME_STORAGE_KEY)
    if (value === 'light' || value === 'dark') {
      return value
    }
  } catch {
    // ignore storage errors
  }
  return 'dark'
}

export function applyTheme(theme: EraTheme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  try {
    localStorage.setItem(ERA_THEME_STORAGE_KEY, theme)
  } catch {
    // ignore storage errors
  }
}

export function toggleTheme(theme: EraTheme): EraTheme {
  return theme === 'dark' ? 'light' : 'dark'
}
