/** 列表缩略：对阿里云 OSS 公共图追加图片处理，避免拉 2–3MB 原图 */

const OSS_HOST_MARKERS = ['.aliyuncs.com'] as const

export type OssListThumbOptions = {
  /** 目标宽度；移动端宜更小 */
  width?: number
  quality?: number
}

function isAliyunOssUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  return host.endsWith('.aliyuncs.com') || host === 'aliyuncs.com'
}

/** 视口宽度推断列表缩略边长：移动更省流量 */
export function listThumbWidthForViewport(viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024): number {
  if (viewportWidth < 640) return 240
  if (viewportWidth < 1024) return 320
  return 400
}

/**
 * 返回适合列表封面的缩略 URL；非 OSS 或已带 process 时原样返回。
 * data: URL 原样返回（应由迁移脚本换成 CDN）。
 */
export function ossListThumbUrl(raw: string, options: OssListThumbOptions = {}): string {
  const src = raw.trim()
  if (!src || src.startsWith('data:')) return src

  const width = options.width ?? 400
  const quality = options.quality ?? 75
  const process = `image/resize,w_${width}/format,webp/quality,q_${quality}`

  try {
    const url = new URL(src)
    if (!isAliyunOssUrl(url)) return src

    const existing = url.searchParams.get('x-oss-process') || ''
    if (existing.includes('image/resize') || existing.includes('/format,webp')) {
      return src
    }

    url.searchParams.set('x-oss-process', process)
    return url.toString()
  } catch {
    if (!OSS_HOST_MARKERS.some((m) => src.includes(m))) return src
    const join = src.includes('?') ? '&' : '?'
    if (src.includes('x-oss-process=')) return src
    return `${src}${join}x-oss-process=${encodeURIComponent(process)}`
  }
}
