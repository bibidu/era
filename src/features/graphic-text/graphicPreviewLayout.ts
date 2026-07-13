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

export const TOP_BAR_FONT_SIZE_PX = 10
export const HEADING_FONT_SCALE = 0.58
