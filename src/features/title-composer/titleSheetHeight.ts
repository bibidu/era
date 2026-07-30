const STORAGE_KEY = 'era-title-composer-sheet-height'
const SHEET_MIN_HEIGHT_PX = 220
const SHEET_TOP_RESERVE_PX = 160

export function getTitleViewportHeight() {
  if (typeof window === 'undefined') return 800
  return window.visualViewport?.height ?? window.innerHeight
}

export function computeDefaultTitleSheetHeight(viewportHeight = getTitleViewportHeight()) {
  return Math.max(
    SHEET_MIN_HEIGHT_PX,
    Math.min(Math.round(viewportHeight * 0.42), viewportHeight - SHEET_TOP_RESERVE_PX),
  )
}

export function clampTitleSheetHeight(height: number, viewportHeight = getTitleViewportHeight()) {
  return Math.max(
    SHEET_MIN_HEIGHT_PX,
    Math.min(height, viewportHeight - SHEET_TOP_RESERVE_PX),
  )
}

export function readCachedTitleSheetHeight(viewportHeight = getTitleViewportHeight()) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) {
        return clampTitleSheetHeight(parsed, viewportHeight)
      }
    }
  } catch {
    // ignore
  }
  return computeDefaultTitleSheetHeight(viewportHeight)
}

export function writeCachedTitleSheetHeight(height: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.round(height)))
  } catch {
    // ignore
  }
}
