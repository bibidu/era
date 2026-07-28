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
  document.querySelectorAll(`meta[name="${name}"]`).forEach((node) => {
    if (!media && !(node as HTMLMetaElement).media) {
      node.remove()
      return
    }
    if (media && (node as HTMLMetaElement).media === media) {
      node.remove()
    }
  })
  const meta = document.createElement('meta')
  meta.name = name
  meta.content = content
  if (media) {
    meta.media = media
  }
  document.head.appendChild(meta)
}

/**
 * Safari 26+ ignores theme-color and samples toolbar tint from:
 * 1) fixed/sticky edge backgrounds, or 2) body background at first paint.
 * JS color changes after paint do not re-tint the Apple chrome.
 */
export function applyTheme(theme: EraTheme) {
  const color = ERA_THEME_COLORS[theme]
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.documentElement.style.backgroundColor = color
  document.documentElement.style.setProperty('--era-header', color)
  if (document.body) {
    document.body.style.backgroundColor = color
  }

  // Keep for older browsers / Android Chrome; Safari 26+ ignores this.
  replaceMeta('theme-color', color)
  replaceMeta('theme-color', color, '(prefers-color-scheme: light)')
  replaceMeta('theme-color', color, '(prefers-color-scheme: dark)')
  // black-translucent: let page top edge show through; tint comes from fixed sampler / body.
  replaceMeta('apple-mobile-web-app-status-bar-style', 'black-translucent')

  const sampler = document.getElementById('era-safari-tint')
  if (sampler) {
    sampler.style.backgroundColor = color
  }

  try {
    localStorage.setItem(ERA_THEME_STORAGE_KEY, theme)
  } catch {
    // ignore storage errors
  }
}

export function prefersSafariToolbarReload() {
  const ua = navigator.userAgent || ''
  const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/.test(ua)
  return isIOS || isSafari
}

export function toggleTheme(theme: EraTheme): EraTheme {
  return theme === 'dark' ? 'light' : 'dark'
}
