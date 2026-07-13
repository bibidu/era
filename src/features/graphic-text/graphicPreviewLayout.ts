export const TOP_BAR_FONT_SIZE_PX = 10
export const HEADING_FONT_SCALE = 0.58
export const PREVIEW_NAV_BUTTON_WIDTH = 40
export const PREVIEW_NAV_GAP = 8
export const PREVIEW_VERTICAL_PADDING = 48
export const WORKSPACE_PREVIEW_HORIZONTAL_PADDING = 32
export const WORKSPACE_PREVIEW_VERTICAL_RESERVE = 14 * 16

export function computeGraphicPageDisplaySize(
  aspect: { width: number; height: number },
  maxWidth: number,
  maxHeight: number,
) {
  if (maxWidth <= 0 || maxHeight <= 0) return null

  let width = maxWidth
  let height = (width * aspect.height) / aspect.width

  if (height > maxHeight) {
    height = maxHeight
    width = (height * aspect.width) / aspect.height
  }

  return { width, height }
}

export function computeWorkspacePagerPageSize(
  aspect: { width: number; height: number },
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
) {
  return computeGraphicPageDisplaySize(
    aspect,
    viewportWidth - WORKSPACE_PREVIEW_HORIZONTAL_PADDING,
    viewportHeight - WORKSPACE_PREVIEW_VERTICAL_RESERVE,
  )
}

export interface ConfigPreviewLayout {
  sourceWidth: number
  sourceHeight: number
  scale: number
  width: number
  height: number
}

export function computeConfigPreviewLayout(
  aspect: { width: number; height: number },
  previewAreaHeight: number,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
): ConfigPreviewLayout | null {
  const sourceSize = computeWorkspacePagerPageSize(aspect, viewportWidth, viewportHeight)
  if (!sourceSize || previewAreaHeight <= 0) return null

  const navReserve = PREVIEW_NAV_BUTTON_WIDTH * 2 + PREVIEW_NAV_GAP * 2 + 16
  const availableWidth = viewportWidth - navReserve
  const availableHeight = previewAreaHeight - PREVIEW_VERTICAL_PADDING

  const scale = Math.min(
    availableWidth / sourceSize.width,
    availableHeight / sourceSize.height,
    1,
  )

  return {
    sourceWidth: sourceSize.width,
    sourceHeight: sourceSize.height,
    scale,
    width: sourceSize.width * scale,
    height: sourceSize.height * scale,
  }
}

/** @deprecated Use computeConfigPreviewLayout for sheet preview sizing. */
export function computeConfigPreviewPageSize(
  aspect: { width: number; height: number },
  viewportWidth: number,
  previewAreaHeight: number,
) {
  const layout = computeConfigPreviewLayout(aspect, previewAreaHeight, viewportWidth)
  if (!layout) return null
  return { width: layout.width, height: layout.height }
}
