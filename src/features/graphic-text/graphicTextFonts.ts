import type { FontSizeTarget } from './graphicConfigPanels'
import type { GraphicTextConfig } from './types'

export const LATIN_FONT_FAMILY = '"IBM Plex Mono", Menlo, Monaco, "Courier New", ui-monospace, monospace'

export function resolveLatinFamily(config?: Pick<GraphicTextConfig, 'latinFontFamily'>) {
  return config?.latinFontFamily?.trim() || LATIN_FONT_FAMILY
}

export function latinFamilyName(latinFamily: string) {
  return latinFamily.split(',')[0].trim()
}

export function withLatinMenlo(fontFamily: string, latinFamily = LATIN_FONT_FAMILY) {
  const latin = latinFamilyName(latinFamily)
  if (!fontFamily) return latin
  if (fontFamily.includes(latin.replace(/"/g, ''))) return fontFamily
  return `${latin}, ${fontFamily}`
}

export function cjkFontFamily(fontFamily: string) {
  const parts = fontFamily.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length <= 1) return fontFamily
  const first = parts[0].replace(/"/g, '')
  const latinPrefixes = [
    'IBM Plex Mono',
    'Menlo',
    'Monaco',
    'Courier New',
    'ui-monospace',
    'SFMono-Regular',
    'SF Mono',
    'Consolas',
    'Liberation Mono',
    'monospace',
    'JetBrains Mono',
    'Ubuntu Mono',
  ]
  if (latinPrefixes.some((name) => first.includes(name))) {
    return parts.slice(1).join(', ')
  }
  return fontFamily
}

export function getFontConfigForTarget(config: GraphicTextConfig, target: FontSizeTarget) {
  switch (target) {
    case 'title':
      return { fontId: config.titleFontId, fontFamily: config.titleFontFamily }
    case 'heading':
      return { fontId: config.headingFontId, fontFamily: config.headingFontFamily }
    case 'body':
      return { fontId: config.bodyFontId, fontFamily: config.bodyFontFamily }
    case 'code':
      return { fontId: config.codeFontId, fontFamily: config.codeFontFamily }
  }
}

export function getFontConfigForStyleType(config: GraphicTextConfig, styleType: string) {
  const latin = resolveLatinFamily(config)
  if (styleType === 'title') return getFontConfigForTarget(config, 'title')
  if (styleType === 'heading') {
    const heading = getFontConfigForTarget(config, 'heading')
    return { ...heading, fontFamily: withLatinMenlo(heading.fontFamily, latin) }
  }
  if (styleType === 'code') return getFontConfigForTarget(config, 'code')
  const body = getFontConfigForTarget(config, 'body')
  return { ...body, fontFamily: withLatinMenlo(body.fontFamily, latin) }
}

export function collectGraphicFontIds(config: GraphicTextConfig) {
  return [...new Set([config.titleFontId, config.headingFontId, config.bodyFontId, config.codeFontId])]
}
