import {
  LEGACY_SUPABASE_ANON_KEY,
  LEGACY_SUPABASE_URL,
} from '../../agent/supabaseHighlightSetup'

export interface PreviewImageItem {
  src: string
  alt?: string
}

export type DownloadPreviewResult = {
  mode: 'ios-share'
  savedCount: number
  failedCount: number
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

function buildImageProxyUrl(imageUrl: string): string {
  const endpoint = new URL(`${LEGACY_SUPABASE_URL}/functions/v1/image-proxy`)
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

async function collectImageFiles(images: PreviewImageItem[]): Promise<{
  files: File[]
  errors: string[]
}> {
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
        files.push(new File([bytes.slice()], name, { type: mimeFromExt(ext) }))
      } catch (error) {
        errors.push(`第 ${index + 1} 张：${error instanceof Error ? error.message : '下载失败'}`)
      }
    }),
  )

  files.sort((left, right) => left.name.localeCompare(right.name))
  return { files, errors }
}

function canShareFiles(files: File[]): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }
  if (typeof navigator.canShare === 'function') {
    try {
      return navigator.canShare({ files })
    } catch {
      return false
    }
  }
  // 无 canShare 时仍尝试 share（旧 WebKit）
  return true
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * 通过系统分享把图片交给用户存入苹果相册（分享菜单选「存储到照片」）。
 * 不打包 zip、不下载到「文件」。
 */
async function shareFilesToPhotos(files: File[]): Promise<void> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    throw new Error('当前环境无法调起系统分享，请用 iPhone Safari 打开后保存到相册')
  }

  // 优先一次分享全部，便于出现「存储 X 张照片」
  if (canShareFiles(files)) {
    try {
      await navigator.share({
        files,
        title: '保存到照片',
      })
      return
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error('已取消保存')
      }
      // 批量分享失败时再逐张分享（仍不走 zip）
    }
  }

  if (files.length <= 1) {
    if (!canShareFiles(files)) {
      throw new Error('当前环境无法分享图片到相册，请用 iPhone Safari 打开')
    }
    try {
      await navigator.share({
        files,
        title: '保存到照片',
      })
      return
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error('已取消保存')
      }
      throw new Error(error instanceof Error ? error.message : '分享失败，请重试')
    }
  }

  // 逐张分享：每张都进系统分享，用户选「存储到照片」
  for (let index = 0; index < files.length; index += 1) {
    const single = [files[index]]
    if (!canShareFiles(single)) {
      throw new Error('当前环境无法分享图片到相册，请用 iPhone Safari 打开')
    }
    try {
      await navigator.share({
        files: single,
        title: `保存到照片（${index + 1}/${files.length}）`,
      })
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error(
          index === 0
            ? '已取消保存'
            : `已取消；前 ${index} 张可能已保存，其余未分享`,
        )
      }
      throw new Error(
        `第 ${index + 1} 张分享失败：${error instanceof Error ? error.message : '请重试'}`,
      )
    }
  }
}

/**
 * 社媒预览图保存到苹果相册：只走系统分享，禁止 zip / 文件 App 兜底。
 * @deprecated 参数 zipName 已忽略，保留仅为调用方兼容
 */
export async function downloadImagesAsZip(
  images: PreviewImageItem[],
  _zipName = 'preview-images.zip',
): Promise<DownloadPreviewResult> {
  void _zipName
  if (images.length === 0) {
    throw new Error('暂无图片可保存')
  }

  const { files, errors } = await collectImageFiles(images)
  if (files.length === 0) {
    throw new Error(errors[0] || '图片准备失败')
  }

  const failedCount = errors.length
  const savedCount = files.length

  await shareFilesToPhotos(files)

  if (failedCount > 0) {
    throw new Error(
      `请选择「存储到照片」；已准备 ${savedCount} 张，部分失败：${errors.join('；')}`,
    )
  }

  return { mode: 'ios-share', savedCount, failedCount }
}

/** 语义更清晰的别名 */
export const savePreviewImagesToPhotos = downloadImagesAsZip
