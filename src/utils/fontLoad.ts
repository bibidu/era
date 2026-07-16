import type { FontOption } from '../data/fonts'
import { sleep } from './async'

const loadedFontIds = new Set<string>()
const inFlight = new Map<string, Promise<boolean>>()

const FONT_LOAD_TIMEOUT_MS = 6000
const GLYPH_LOAD_TIMEOUT_MS = 3000

function primaryFamily(fontFamily: string) {
  return fontFamily.replace(/"/g, '').split(',')[0].trim()
}

function withTimeoutReject<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    sleep(ms).then(() => {
      throw new Error(message)
    }),
  ])
}

async function loadStylesheet(id: string, href: string): Promise<void> {
  const existing = document.querySelector(`link[data-font-id="${id}"]`)
  if (existing) return

  await withTimeoutReject(
    new Promise<void>((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.dataset.fontId = id
      link.onload = () => resolve()
      link.onerror = () => reject(new Error('font stylesheet load failed'))
      document.head.appendChild(link)
    }),
    FONT_LOAD_TIMEOUT_MS,
    '字体样式表加载超时',
  )
}

async function waitForGlyphs(family: string, sampleText: string, fontSize = 24) {
  const text = sampleText.trim() || '文字'
  const uniqueChars = [...new Set(text)].join('')
  if (!uniqueChars) return

  await withTimeoutReject(
    document.fonts.load(`${fontSize}px "${family}"`, uniqueChars).catch(() => undefined),
    GLYPH_LOAD_TIMEOUT_MS,
    '字体字形加载超时',
  )
}

async function loadFontInternal(font: FontOption, sampleText: string): Promise<boolean> {
  if (font.source === 'system') return true

  if (loadedFontIds.has(font.id)) {
    if (font.source === 'cdn' || font.source === 'google') {
      await waitForGlyphs(
        primaryFamily(font.fontFamily),
        sampleText,
        font.source === 'google' ? 16 : 24,
      )
    }
    return true
  }

  if (font.source === 'google' && font.googleFamily) {
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
}

export async function ensureFontReady(font: FontOption, sampleText = '你好世界'): Promise<boolean> {
  if (font.source === 'system') return true

  const inflight = inFlight.get(font.id)
  if (inflight) return inflight

  const promise = loadFontInternal(font, sampleText)
    .catch(() => false)
    .finally(() => {
      inFlight.delete(font.id)
    })

  inFlight.set(font.id, promise)
  return promise
}

/** 导出前等待字体就绪，失败时抛出错误 */
export async function ensureFontsReadyForExport(
  fonts: FontOption[],
  sampleByFontId: Map<string, string>,
  options?: { fontTimeoutMs?: number; fontsReadyTimeoutMs?: number },
): Promise<void> {
  const fontTimeoutMs = options?.fontTimeoutMs ?? 8000
  const fontsReadyTimeoutMs = options?.fontsReadyTimeoutMs ?? 3000

  const results = await Promise.all(
    fonts.map(async (font) => {
      if (font.source === 'system') return true
      const sample = sampleByFontId.get(font.id) || font.sample
      return withTimeoutReject(
        loadFontInternal(font, sample),
        fontTimeoutMs,
        `字体「${font.label}」加载超时`,
      )
    }),
  )

  if (results.some((ok) => !ok)) {
    throw new Error('部分字体未能加载，请检查网络后重试')
  }

  await withTimeoutReject(
    document.fonts.ready,
    fontsReadyTimeoutMs,
    '字体尚未就绪，请稍后重试',
  )
}

export function isRemoteFontLoaded(fontId: string) {
  return loadedFontIds.has(fontId)
}

export function isFontLoaded(font: FontOption): boolean {
  if (font.source === 'system') return true
  return loadedFontIds.has(font.id)
}
