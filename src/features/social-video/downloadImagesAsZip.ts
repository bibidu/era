import { zipSync } from 'fflate'
import { browserSupabaseConfig } from '../../agent/supabaseHighlightSetup'

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

/** 将多张图片打成一个 zip 并触发下载（含 OSS CORS 代理） */
export async function downloadImagesAsZip(
  images: PreviewImageItem[],
  zipName = 'preview-images.zip',
): Promise<void> {
  if (images.length === 0) {
    throw new Error('暂无图片可下载')
  }

  const files: Record<string, Uint8Array> = {}
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
        files[name] = bytes
      } catch (error) {
        errors.push(`第 ${index + 1} 张：${error instanceof Error ? error.message : '下载失败'}`)
      }
    }),
  )

  if (Object.keys(files).length === 0) {
    throw new Error(errors[0] || '图片下载失败')
  }

  const zipped = zipSync(files, { level: 0 })
  const blob = new Blob([zipped], { type: 'application/zip' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)

  if (errors.length > 0) {
    throw new Error(`已打包 ${Object.keys(files).length} 张；部分失败：${errors.join('；')}`)
  }
}
