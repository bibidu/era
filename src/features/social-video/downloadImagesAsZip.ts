import { zipSync } from 'fflate'

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

async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; ext: string }> {
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' })
  if (!response.ok) {
    throw new Error(`下载失败（${response.status}）`)
  }
  const buffer = await response.arrayBuffer()
  return {
    bytes: new Uint8Array(buffer),
    ext: extensionFromUrlOrType(url, response.headers.get('content-type')),
  }
}

/** 将多张图片打成 zip 并触发浏览器下载 */
export async function downloadImagesAsZip(
  images: PreviewImageItem[],
  zipName = 'images.zip',
): Promise<void> {
  if (images.length === 0) {
    throw new Error('暂无图片可下载')
  }

  const files: Record<string, Uint8Array> = {}
  const errors: string[] = []

  await Promise.all(
    images.map(async (image, index) => {
      try {
        const { bytes, ext } = await fetchImageBytes(image.src)
        const name = `image-${String(index + 1).padStart(2, '0')}.${ext}`
        files[name] = bytes
      } catch (error) {
        errors.push(
          `第 ${index + 1} 张：${error instanceof Error ? error.message : '下载失败'}`,
        )
      }
    }),
  )

  if (Object.keys(files).length === 0) {
    throw new Error(errors[0] || '图片下载失败（可能受跨域限制）')
  }

  const zipped = zipSync(files, { level: 0 })
  const blob = new Blob([zipped], { type: 'application/zip' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = zipName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500)

  if (errors.length > 0) {
    throw new Error(`已打包 ${Object.keys(files).length} 张；部分失败：${errors.join('；')}`)
  }
}
