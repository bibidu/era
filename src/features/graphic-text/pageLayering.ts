import type { GraphicTextConfig } from './types'

export function usesOverlayAsBackground(config: GraphicTextConfig) {
  if (config.overlayStacked) return false
  return (
    config.pageOverlay === 'gradient' ||
    config.pageOverlay === 'pixel' ||
    config.pageOverlay === 'wiremesh'
  )
}

export function shouldDrawPageOverlay(config: GraphicTextConfig) {
  return config.pageOverlay !== 'none'
}

export function usesConfiguredBaseBackground(config: GraphicTextConfig) {
  return config.overlayStacked
}

export function shouldDrawReferenceBackground(config: GraphicTextConfig) {
  return (
    usesConfiguredBaseBackground(config) &&
    config.backgroundType === 'reference' &&
    Boolean(config.backgroundUrl)
  )
}

export function shouldDrawBaseBackground(config: GraphicTextConfig) {
  if (usesOverlayAsBackground(config)) return false
  return true
}
