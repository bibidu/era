import type { GraphicTextConfig } from './types'

export function usesOverlayAsBackground(config: GraphicTextConfig) {
  if (config.overlayStacked) return false
  return config.pageOverlay === 'gradient' || config.pageOverlay === 'pixel'
}

export function shouldDrawPageOverlay(config: GraphicTextConfig) {
  return config.pageOverlay !== 'none'
}

export function shouldDrawBaseBackground(config: GraphicTextConfig) {
  if (usesOverlayAsBackground(config)) return false
  return true
}
