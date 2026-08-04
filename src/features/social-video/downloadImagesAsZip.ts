import { legacyEdgeFunctionUrl } from '../../agent/legacyEdgeFunctionUrl'
import { LEGACY_SUPABASE_ANON_KEY } from '../../agent/supabaseHighlightSetup'
import {
  describePhotosShareBlocker,
  getPhotosShareHttpsUpgradeUrl,
  isPhotosShareAvailable,
} from './photosShareEnv'

export interface PreviewImageItem {
  src: string
  alt?: string
}

export type DownloadPreviewResult = {
  mode: 'ios-share'
  savedCount: number
  failedCount: number
}

export type PreparedPreviewImages = {
  /** 与输入 images 等长；失败位置为 null */
  filesByIndex: (File | null)[]
  /** 仅成功的 File，顺序与原 index 升序一致 */
  files: File[]
  errors: string[]
}

function extensionFromUrlOrType(url: string, contentType: string | null): string {
  const type = (contentType || '').toLowerCase()
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg'
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  if (type.includes('gif')) return 'gif'
  if (type.includes('svg')) return 'svg'

  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/)
    if (match) return match[1].toLowerCase()
  } catch {
    // ignore invalid URL
  }
  return 'jpg'
}

function mimeFromExt(ext: string): string {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'image/jpeg'
  }
}

/** iOS 对 webp/svg 分享支持不稳定，尽量落到 jpeg/png */
function normalizeShareExt(ext: string): { ext: string; mime: string } {
  if (ext === 'jpg' || ext === 'jpeg') return { ext: 'jpg', mime: 'image/jpeg' }
  if (ext === 'png') return { ext: 'png', mime: 'image/png' }
  if (ext === 'gif') return { ext: 'gif', mime: 'image/gif' }
  // webp/svg/未知 → jpeg（多数相册路径最稳）
  return { ext: 'jpg', mime: 'image/jpeg' }
}

function buildImageProxyUrl(imageUrl: string): string {
  const endpoint = new URL(legacyEdgeFunctionUrl('image-proxy'))
  endpoint.searchParams.set('url', imageUrl)
  return endpoint.toString()
}

async function fetchViaProxy(imageUrl: string): Promise<Response> {
  return fetch(buildImageProxyUrl(imageUrl), {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      apikey: LEGACY_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${LEGACY_SUPABASE_ANON_KEY}`,
    },
  })
}

async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; ext: string }> {
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`下载失败（${response.status}）`)
    const buffer = await response.arrayBuffer()
    return {
      bytes: new Uint8Array(buffer),
      ext: extensionFromUrlOrType(url, response.headers.get('content-type')),
    }
  }

  let response: Response | null = null
  let lastError: unknown

  try {
    response = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!response.ok) {
      throw new Error(`下载失败（${response.status}）`)
    }
  } catch (error) {
    lastError = error
    response = null
  }

  if (!response) {
    try {
      response = await fetchViaProxy(url)
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || `代理下载失败（${response.status}）`)
      }
    } catch (error) {
      const raw =
        error instanceof Error
          ? error.message
          : lastError instanceof Error
            ? lastError.message
            : '下载失败'
      const message = /load failed|failed to fetch/i.test(raw) ? '跨域下载失败' : raw
      throw new Error(message)
    }
  }

  const buffer = await response.arrayBuffer()
  return {
    bytes: new Uint8Array(buffer),
    ext: extensionFromUrlOrType(url, response.headers.get('content-type')),
  }
}

async function bytesToShareFile(
  bytes: Uint8Array,
  index: number,
  rawExt: string,
): Promise<File> {
  const { ext, mime } = normalizeShareExt(rawExt)
  const name = `image-${String(index + 1).padStart(2, '0')}.${ext}`

  // webp/svg 等：画到 canvas 转成 jpeg，提高 iOS canShare 成功率
  if (rawExt === 'webp' || rawExt === 'svg' || (ext === 'jpg' && rawExt !== 'jpg' && rawExt !== 'jpeg')) {
    try {
      const blob = new Blob([bytes.slice()], { type: mimeFromExt(rawExt) })
      const bitmap = await createImageBitmap(blob)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas unavailable')
      ctx.drawImage(bitmap, 0, 0)
      bitmap.close()
      const jpegBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('toBlob failed'))),
          'image/jpeg',
          0.92,
        )
      })
      return new File([jpegBlob], name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
    } catch {
      // 转码失败则仍用原字节
    }
  }

  const copy = bytes.slice()
  const blob = new Blob([copy], { type: mime })
  return new File([blob], name, { type: mime })
}

/** 打开弹层时预拉取，避免点击后再 await 导致 iOS 丢失用户手势 */
export async function preparePreviewImagesForShare(
  images: PreviewImageItem[],
): Promise<PreparedPreviewImages> {
  const filesByIndex: (File | null)[] = images.map(() => null)
  const errors: string[] = []

  await Promise.all(
    images.map(async (image, index) => {
      try {
        const { bytes, ext } = await fetchImageBytes(image.src)
        filesByIndex[index] = await bytesToShareFile(bytes, index, ext)
      } catch (error) {
        errors.push(`第 ${index + 1} 张：${error instanceof Error ? error.message : '下载失败'}`)
      }
    }),
  )

  const files = filesByIndex.filter((file): file is File => Boolean(file))
  return { filesByIndex, files, errors }
}

function canShareFiles(files: File[]): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }
  if (typeof navigator.canShare !== 'function') {
    return true
  }
  try {
    return navigator.canShare({ files })
  } catch {
    return false
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && /abort|cancel|取消/i.test(error.name + error.message))
  )
}

function isNotAllowedError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'NotAllowedError') ||
    (error instanceof Error && /not allowed|user gesture|activation/i.test(error.message))
  )
}

/**
 * 必须在用户点击的同步调用链里调用（前面不能有 await 拉图）。
 * 一次分享全部选中图片，让系统菜单出现「存储到照片」。
 */
export async function sharePreparedImagesToPhotos(files: File[]): Promise<void> {
  if (files.length === 0) {
    throw new Error('暂无图片可保存')
  }
  if (!isPhotosShareAvailable()) {
    const httpsUrl = getPhotosShareHttpsUpgradeUrl()
    if (httpsUrl) {
      throw new Error(`${describePhotosShareBlocker()}（将跳转 HTTPS）`)
    }
    throw new Error(describePhotosShareBlocker())
  }

  if (!canShareFiles(files)) {
    // 尝试缩到单张探测是否完全不支持文件分享
    if (files.length > 1 && canShareFiles([files[0]])) {
      throw new Error('一次选太多张无法分享，请少选几张后再试')
    }
    throw new Error(describePhotosShareBlocker())
  }

  try {
    // 不传 text，减少部分 WebKit 对 files+text 组合的限制
    await navigator.share({ files })
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('已取消保存')
    }
    if (isNotAllowedError(error)) {
      throw new Error('分享被拦截：请直接点击「保存到相册」，勿锁屏或切换应用后重试')
    }
    throw new Error(error instanceof Error ? error.message : '分享失败，请重试')
  }
}

/**
 * 兼容旧调用：内部先准备再分享。
 * 注意：若在点击后才调用，iOS 可能因丢失手势而失败；弹层应改用预拉取 + sharePreparedImagesToPhotos。
 */
export async function downloadImagesAsZip(
  images: PreviewImageItem[],
  _zipName = 'preview-images.zip',
): Promise<DownloadPreviewResult> {
  void _zipName
  if (images.length === 0) {
    throw new Error('暂无图片可保存')
  }

  const { files, errors } = await preparePreviewImagesForShare(images)
  if (files.length === 0) {
    throw new Error(errors[0] || '图片准备失败')
  }

  await sharePreparedImagesToPhotos(files)

  if (errors.length > 0) {
    throw new Error(
      `请选择「存储到照片」；已准备 ${files.length} 张，部分失败：${errors.join('；')}`,
    )
  }

  return { mode: 'ios-share', savedCount: files.length, failedCount: errors.length }
}

export const savePreviewImagesToPhotos = downloadImagesAsZip
