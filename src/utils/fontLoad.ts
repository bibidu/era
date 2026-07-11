import type { FontOption } from '../data/fonts'
import { ensurePixelFontLoaded } from './pixelFont'

const loadedFontIds = new Set<string>()

function primaryFamily(fontFamily: string) {
  return fontFamily.replace(/"/g, '').split(',')[0].trim()
}

async function loadStylesheet(id: string, href: string): Promise<void> {
  const existing = document.querySelector(`link[data-font-id="${id}"]`)
  if (existing) return

  await new Promise<void>((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.dataset.fontId = id
    link.onload = () => resolve()
    link.onerror = () => reject(new Error('font stylesheet load failed'))
    document.head.appendChild(link)
  })
}

async function waitForGlyphs(family: string, sampleText: string, fontSize = 24) {
  const text = sampleText.trim() || '文字'
  const uniqueChars = [...new Set(text)].join('')
  await document.fonts.load(`${fontSize}px "${family}"`, uniqueChars)
  await document.fonts.ready
}

export async function ensureFontReady(font: FontOption, sampleText = '你好世界'): Promise<boolean> {
  if (font.source === 'system') return true
  if (loadedFontIds.has(font.id)) {
    if (font.source === 'cdn') {
      await waitForGlyphs(primaryFamily(font.fontFamily), sampleText)
    }
    return true
  }

  try {
    if (font.source === 'pixel') {
      const ok = await ensurePixelFontLoaded(font)
      if (!ok) return false
    } else if (font.source === 'google' && font.googleFamily) {
      await loadStylesheet(font.id, `https://fonts.googleapis.com/css2?family=${font.googleFamily}&display=swap`)
      await waitForGlyphs(primaryFamily(font.fontFamily), sampleText, 16)
    } else if (font.source === 'cdn' && font.cdnUrl) {
      await loadStylesheet(font.id, font.cdnUrl)
      await waitForGlyphs(primaryFamily(font.fontFamily), sampleText)
    } else {
      return false
    }

    loadedFontIds.add(font.id)
    return true
  } catch {
    return false
  }
}

export function isRemoteFontLoaded(fontId: string) {
  return loadedFontIds.has(fontId)
}
