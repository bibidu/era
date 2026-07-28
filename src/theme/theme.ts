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

function upsertMeta(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = name
    document.head.appendChild(meta)
  }
  meta.content = content
}

export function applyTheme(theme: EraTheme) {
  const color = ERA_THEME_COLORS[theme]
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.documentElement.style.backgroundColor = color
  document.body.style.backgroundColor = color

  upsertMeta('theme-color', color)
  upsertMeta('apple-mobile-web-app-status-bar-style', theme === 'dark' ? 'black' : 'default')

  // Some browsers keep multiple theme-color metas for media queries; keep a single source of truth.
  document.querySelectorAll('meta[name="theme-color"]').forEach((node, index) => {
    if (index === 0) {
      ;(node as HTMLMetaElement).content = color
      return
    }
    node.remove()
  })

  try {
    localStorage.setItem(ERA_THEME_STORAGE_KEY, theme)
  } catch {
    // ignore storage errors
  }
}

export function toggleTheme(theme: EraTheme): EraTheme {
  return theme === 'dark' ? 'light' : 'dark'
}
