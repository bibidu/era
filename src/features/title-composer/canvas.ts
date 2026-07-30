import { GRAPHIC_DISPLAY_BASE_WIDTH } from '../graphic-text/layout'

/** 与图文导出画布一致：1080 宽，左右安全边 96 */
export const TITLE_EXPORT_WIDTH = 1080
export const TITLE_SAFE_X = 96
export const TITLE_DISPLAY_WIDTH = GRAPHIC_DISPLAY_BASE_WIDTH
export const TITLE_SAFE_X_PERCENT = (TITLE_SAFE_X / TITLE_EXPORT_WIDTH) * 100

/** 把设计稿字号（相对 display 360）转成 cqw，随容器宽度缩放 */
export function toCqw(displayPx: number): string {
  return `${(displayPx / TITLE_DISPLAY_WIDTH) * 100}cqw`
}
