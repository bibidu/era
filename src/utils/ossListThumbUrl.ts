/** 列表缩略：对阿里云 OSS 公共图追加图片处理，避免拉 2–3MB 原图 */

const OSS_HOST_MARKERS = ['.aliyuncs.com', '.aliyuncs.com/'] as const

const LIST_THUMB_PROCESS = 'image/resize,w_400/format,webp/quality,q_75'

function isAliyunOssUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  return host.endsWith('.aliyuncs.com') || host === 'aliyuncs.com'
}

/**
 * 返回适合列表封面的缩略 URL；非 OSS 或已带 process 时原样返回。
 * 签名 URL 若已含 query，会覆盖/设置 `x-oss-process`（公共封面适用）。
 */
export function ossListThumbUrl(raw: string): string {
  const src = raw.trim()
  if (!src) return src

  try {
    const url = new URL(src)
    if (!isAliyunOssUrl(url)) return src

    // 已是处理链或本地/data 不重复加工
    const existing = url.searchParams.get('x-oss-process') || ''
    if (existing.includes('image/resize') || existing.includes('/format,webp')) {
      return src
    }

    url.searchParams.set('x-oss-process', LIST_THUMB_PROCESS)
    return url.toString()
  } catch {
    // 相对路径等：尝试简单拼接
    if (!OSS_HOST_MARKERS.some((m) => src.includes(m))) return src
    const join = src.includes('?') ? '&' : '?'
    if (src.includes('x-oss-process=')) return src
    return `${src}${join}x-oss-process=${encodeURIComponent(LIST_THUMB_PROCESS)}`
  }
}
