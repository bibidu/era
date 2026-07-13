export const TOP_BAR_FONT_SIZE_PX = 10
export const HEADING_FONT_SCALE = 0.58
export const PREVIEW_NAV_BUTTON_WIDTH = 40
export const PREVIEW_NAV_GAP = 8
export const PREVIEW_VERTICAL_PADDING = 48

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

export function computeConfigPreviewPageSize(
  aspect: { width: number; height: number },
  viewportWidth: number,
  previewAreaHeight: number,
) {
  const navReserve = PREVIEW_NAV_BUTTON_WIDTH * 2 + PREVIEW_NAV_GAP * 2 + 16
  return computeGraphicPageDisplaySize(
    aspect,
    viewportWidth - navReserve,
    previewAreaHeight - PREVIEW_VERTICAL_PADDING,
  )
}
