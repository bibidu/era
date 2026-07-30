import { getGraphicLayout, GRAPHIC_DISPLAY_BASE_WIDTH } from '../graphic-text/layout'
import type { GraphicAspectRatio } from '../graphic-text/types'

/** 与图文导出画布一致 */
export const TITLE_EXPORT_WIDTH = 1080
export const TITLE_SAFE_X = 96
export const TITLE_DISPLAY_WIDTH = GRAPHIC_DISPLAY_BASE_WIDTH
export const TITLE_DEFAULT_ASPECT: GraphicAspectRatio = '9:16'

/** 标题预览 / 导出共用的页面几何（与 GraphicPage 完全一致） */
export function getTitlePageLayout(aspectRatio: GraphicAspectRatio = TITLE_DEFAULT_ASPECT) {
  const layout = getGraphicLayout({ aspectRatio })
  return {
    ...layout,
    /** 安全区内容宽（display 单位） */
    contentWidthDisplay:
      TITLE_DISPLAY_WIDTH * (1 - (2 * TITLE_SAFE_X) / TITLE_EXPORT_WIDTH),
  }
}

export const TITLE_SAFE_X_PERCENT = (TITLE_SAFE_X / TITLE_EXPORT_WIDTH) * 100

/** 把设计稿字号（相对整页 display 360）转成 cqw；容器必须是整页宽 */
export function toCqw(displayPx: number): string {
  return `${(displayPx / TITLE_DISPLAY_WIDTH) * 100}cqw`
}

/** 相对整页高度的 cqh（容器须为整页且建立容器查询） */
export function toCqh(exportPx: number, pageHeight: number): string {
  return `${(exportPx / pageHeight) * 100}cqh`
}
