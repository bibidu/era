export type EraTheme = 'dark' | 'light'

export const ERA_THEME_STORAGE_KEY = 'era-theme'
export const ERA_THEME_COLORS: Record<EraTheme, string> = {
  dark: '#0a0a0a',
  light: '#ffffff',
}

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

function replaceMeta(name: string, content: string, media?: string) {
  document.querySelectorAll(`meta[name="${name}"]`).forEach((node) => node.remove())
  const meta = document.createElement('meta')
  meta.name = name
  meta.content = content
  if (media) {
    meta.media = media
  }
  document.head.appendChild(meta)
}

export function applyTheme(theme: EraTheme) {
  const color = ERA_THEME_COLORS[theme]
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.documentElement.style.backgroundColor = color
  if (document.body) {
    document.body.style.backgroundColor = color
  }

  // Recreate theme-color metas so Safari re-reads them.
  // Keep both media variants on the active app theme so system preference cannot pin the bar black.
  replaceMeta('theme-color', color)
  replaceMeta('theme-color', color, '(prefers-color-scheme: light)')
  replaceMeta('theme-color', color, '(prefers-color-scheme: dark)')

  // black-translucent lets the themed page background show through the Apple status bar.
  replaceMeta('apple-mobile-web-app-status-bar-style', 'black-translucent')

  try {
    localStorage.setItem(ERA_THEME_STORAGE_KEY, theme)
  } catch {
    // ignore storage errors
  }
}

export function toggleTheme(theme: EraTheme): EraTheme {
  return theme === 'dark' ? 'light' : 'dark'
}
