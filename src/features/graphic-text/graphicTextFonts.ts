import type { FontSizeTarget } from './graphicConfigPanels'
import type { GraphicTextConfig } from './types'

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
  if (styleType === 'title') return getFontConfigForTarget(config, 'title')
  if (styleType === 'heading') return getFontConfigForTarget(config, 'heading')
  if (styleType === 'code') return getFontConfigForTarget(config, 'code')
  return getFontConfigForTarget(config, 'body')
}

export function collectGraphicFontIds(config: GraphicTextConfig) {
  return [...new Set([config.titleFontId, config.headingFontId, config.bodyFontId, config.codeFontId])]
}
