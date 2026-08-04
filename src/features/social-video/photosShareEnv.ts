/** 自建站 HTTPS 入口（Caddy 已为 sslip.io 签发证书；裸 IP 仅 HTTP） */
export const ERA_HTTPS_HOST = '39.106.179.17.sslip.io'

export function isPhotosShareAvailable(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (!window.isSecureContext) return false
  return typeof navigator.share === 'function'
}

/**
 * 当前页若因 HTTP / 非安全上下文无法 Web Share，返回可保存到相册的 HTTPS 同源 URL。
 * 已在可用 HTTPS 环境则返回 null。
 */
export function getPhotosShareHttpsUpgradeUrl(): string | null {
  if (typeof window === 'undefined') return null
  if (isPhotosShareAvailable()) return null

  const { pathname, search, hash } = window.location
  return `https://${ERA_HTTPS_HOST}${pathname}${search}${hash}`
}

export function describePhotosShareBlocker(): string {
  if (typeof window === 'undefined') {
    return '当前环境无法保存到相册'
  }
  if (!window.isSecureContext || window.location.protocol !== 'https:') {
    return 'Safari 仅在 HTTPS 下才能调起「存储到照片」。请改用 HTTPS 打开本站后再保存。'
  }
  if (typeof navigator.share !== 'function') {
    return '当前 Safari 未提供系统分享，请升级系统或改用 iPhone 自带 Safari（勿用微信内置浏览器）'
  }
  return '当前环境无法分享图片到相册'
}
