export interface PreviewImageItem {
  src: string
  alt?: string
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

async function fetchImageFile(url: string, index: number): Promise<File> {
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' })
  if (!response.ok) {
    throw new Error(`下载失败（${response.status}）`)
  }
  const buffer = await response.arrayBuffer()
  const ext = extensionFromUrlOrType(url, response.headers.get('content-type'))
  const name = `image-${String(index + 1).padStart(2, '0')}.${ext}`
  return new File([buffer], name, { type: mimeFromExt(ext) })
}

function triggerImageDownload(file: File) {
  const objectUrl = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = file.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/**
 * 将预览图保存到本地相册/下载目录。
 * 优先使用系统分享（移动端可「存储到照片」）；否则逐张下载图片文件。
 */
export async function saveImagesToAlbum(images: PreviewImageItem[]): Promise<void> {
  if (images.length === 0) {
    throw new Error('暂无图片可保存')
  }

  const files: File[] = []
  const errors: string[] = []

  for (let index = 0; index < images.length; index += 1) {
    try {
      files.push(await fetchImageFile(images[index].src, index))
    } catch (error) {
      errors.push(`第 ${index + 1} 张：${error instanceof Error ? error.message : '下载失败'}`)
    }
  }

  if (files.length === 0) {
    throw new Error(errors[0] || '图片下载失败（可能受跨域限制）')
  }

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files })

  if (canShareFiles) {
    try {
      await navigator.share({
        files,
        title: '图片预览',
      })
      if (errors.length > 0) {
        throw new Error(`已分享 ${files.length} 张；部分失败：${errors.join('；')}`)
      }
      return
    } catch (error) {
      // 用户取消分享时不回退成多次下载
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      // 分享失败则回退下载
    }
  }

  for (let index = 0; index < files.length; index += 1) {
    triggerImageDownload(files[index])
    if (index < files.length - 1) {
      await sleep(350)
    }
  }

  if (errors.length > 0) {
    throw new Error(`已保存 ${files.length} 张；部分失败：${errors.join('；')}`)
  }
}
