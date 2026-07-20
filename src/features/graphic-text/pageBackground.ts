import type { CSSProperties } from 'react'
import {
  GRADIENT_OVERLAY_FALLBACK,
  gradientVariantToCss,
  resolveGradientVariant,
} from './pageGradientTokens'
import {
  shouldDrawReferenceBackground,
  usesConfiguredBaseBackground,
  usesOverlayAsBackground,
} from './pageLayering'
import { PIXEL_CANVAS_COLOR } from './pagePixelTokens'
import { WIREMESH_CANVAS_COLOR } from './pageWiremeshTokens'
import type { GraphicTextConfig } from './types'

export const DEFAULT_PAGE_BASE_COLOR = '#FBF7ED'

const GRID_LINE_COLOR = 'rgba(23,23,23,.055)'
const GRID_SIZE_CQW = '3.2cqw'
const GRID_SIZE_PX = 35

export const GRID_BACKGROUND_IMAGE = `linear-gradient(${GRID_LINE_COLOR} 1px, transparent 1px), linear-gradient(90deg, ${GRID_LINE_COLOR} 1px, transparent 1px)`

export function resolvePageBackgroundStyle(config: GraphicTextConfig): CSSProperties {
  const style: CSSProperties = {}

  if (usesOverlayAsBackground(config)) {
    if (config.pageOverlay === 'gradient') {
      const gradientCss = gradientVariantToCss(resolveGradientVariant(config.gradientVariant))
      style.backgroundColor = GRADIENT_OVERLAY_FALLBACK
      style.backgroundImage = gradientCss
    } else if (config.pageOverlay === 'pixel') {
      style.backgroundColor = PIXEL_CANVAS_COLOR
    } else if (config.pageOverlay === 'wiremesh') {
      style.backgroundColor = WIREMESH_CANVAS_COLOR
    }
  } else if (shouldDrawReferenceBackground(config)) {
    style.backgroundImage = `linear-gradient(rgba(255,255,255,.82), rgba(255,255,255,.82)), url("${config.backgroundUrl}")`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
  } else if (usesConfiguredBaseBackground(config) && config.backgroundType === 'solid') {
    style.backgroundColor = config.paperColor
  } else {
    style.backgroundColor = DEFAULT_PAGE_BASE_COLOR
  }

  if (config.pageOverlay === 'grid') {
    if (style.backgroundImage) {
      style.backgroundImage = `${GRID_BACKGROUND_IMAGE}, ${style.backgroundImage}`
      style.backgroundSize = `${GRID_SIZE_CQW} ${GRID_SIZE_CQW}, ${style.backgroundSize ?? 'cover'}`
    } else {
      style.backgroundColor = style.backgroundColor ?? DEFAULT_PAGE_BASE_COLOR
      style.backgroundImage = GRID_BACKGROUND_IMAGE
      style.backgroundSize = `${GRID_SIZE_CQW} ${GRID_SIZE_CQW}`
    }
  }

  return style
}

export function resolvePageBaseFillColor(config: GraphicTextConfig) {
  if (usesOverlayAsBackground(config)) {
    if (config.pageOverlay === 'gradient') return GRADIENT_OVERLAY_FALLBACK
    if (config.pageOverlay === 'pixel') return PIXEL_CANVAS_COLOR
    if (config.pageOverlay === 'wiremesh') return WIREMESH_CANVAS_COLOR
  }
  if (usesConfiguredBaseBackground(config) && config.backgroundType === 'solid') {
    return config.paperColor
  }
  return DEFAULT_PAGE_BASE_COLOR
}

export function drawPageGridOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.strokeStyle = GRID_LINE_COLOR
  ctx.lineWidth = 1
  for (let x = 0; x <= width; x += GRID_SIZE_PX) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y <= height; y += GRID_SIZE_PX) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}
