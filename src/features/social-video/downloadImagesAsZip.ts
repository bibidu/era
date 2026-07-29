import { zipSync } from 'fflate'
import { browserSupabaseConfig } from '../../agent/supabaseHighlightSetup'

export interface PreviewImageItem {
  src: string
  alt?: string
}

export type DownloadPreviewResult =
  | { mode: 'zip'; savedCount: number; failedCount: number }
  | { mode: 'ios-share'; savedCount: number; failedCount: number }

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

function isLikelyIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/i.test(ua)) return true
  // iPadOS 13+ 可能伪装成 Mac
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

function buildImageProxyUrl(imageUrl: string): string {
  const { url } = browserSupabaseConfig()
  const endpoint = new URL(`${url}/functions/v1/image-proxy`)
  endpoint.searchParams.set('url', imageUrl)
  return endpoint.toString()
}

async function fetchViaProxy(imageUrl: string): Promise<Response> {
  const { anonKey } = browserSupabaseConfig()
  return fetch(buildImageProxyUrl(imageUrl), {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
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

async function collectImageFiles(images: PreviewImageItem[]): Promise<{
  files: File[]
  zipEntries: Record<string, Uint8Array>
  errors: string[]
}> {
  const zipEntries: Record<string, Uint8Array> = {}
  const files: File[] = []
  const errors: string[] = []
  const usedNames = new Set<string>()

  await Promise.all(
    images.map(async (image, index) => {
      try {
        const { bytes, ext } = await fetchImageBytes(image.src)
        let name = `image-${String(index + 1).padStart(2, '0')}.${ext}`
        if (usedNames.has(name)) {
          name = `image-${String(index + 1).padStart(2, '0')}-${usedNames.size}.${ext}`
        }
        usedNames.add(name)
        zipEntries[name] = bytes
        // 复制一份给 File，避免与 zip 共享同一 buffer 视图时的潜在问题
        files.push(new File([bytes.slice()], name, { type: mimeFromExt(ext) }))
      } catch (error) {
        errors.push(`第 ${index + 1} 张：${error instanceof Error ? error.message : '下载失败'}`)
      }
    }),
  )

  // 按文件名排序，保证分享/压缩顺序稳定
  files.sort((left, right) => left.name.localeCompare(right.name))

  return { files, zipEntries, errors }
}

function triggerZipDownload(zipEntries: Record<string, Uint8Array>, zipName: string) {
  const zipped = zipSync(zipEntries, { level: 0 })
  const blob = new Blob([zipped], { type: 'application/zip' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
}

async function shareFilesToIosAlbum(files: File[]): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files })) {
    return false
  }
  await navigator.share({
    files,
    title: '图片预览',
  })
  return true
}

/**
 * 下载预览图：
 * - iOS：系统分享图片，用户可选「存储到照片」（相册无法直接存 zip）
 * - 其他：下载包含全部单图的 zip
 */
export async function downloadImagesAsZip(
  images: PreviewImageItem[],
  zipName = 'preview-images.zip',
): Promise<DownloadPreviewResult> {
  if (images.length === 0) {
    throw new Error('暂无图片可下载')
  }

  const { files, zipEntries, errors } = await collectImageFiles(images)
  if (files.length === 0) {
    throw new Error(errors[0] || '图片下载失败')
  }

  const failedCount = errors.length
  const savedCount = files.length

  if (isLikelyIos()) {
    try {
      const shared = await shareFilesToIosAlbum(files)
      if (shared) {
        if (failedCount > 0) {
          throw new Error(
            `请选择「存储到照片」；已准备 ${savedCount} 张，部分失败：${errors.join('；')}`,
          )
        }
        return { mode: 'ios-share', savedCount, failedCount }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('已取消保存')
      }
      if (error instanceof Error && error.message.includes('存储到照片')) {
        throw error
      }
      // 分享不可用则回退 zip（通常进「文件」App，无法进相册）
    }
  }

  triggerZipDownload(zipEntries, zipName)

  if (failedCount > 0) {
    throw new Error(`已打包 ${savedCount} 张；部分失败：${errors.join('；')}`)
  }

  return { mode: 'zip', savedCount, failedCount }
}
