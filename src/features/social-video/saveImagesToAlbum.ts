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

async function fetchImageFile(url: string, index: number): Promise<File> {
  // data:/blob: can be read directly
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    const ext = extensionFromUrlOrType(url, response.headers.get('content-type'))
    return new File([buffer], `image-${String(index + 1).padStart(2, '0')}.${ext}`, {
      type: mimeFromExt(ext),
    })
  }

  let response: Response | null = null
  let lastError: unknown

  // 1) direct fetch（同源或已开 CORS 的源）
  try {
    response = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!response.ok) {
      throw new Error(`下载失败（${response.status}）`)
    }
  } catch (error) {
    lastError = error
    response = null
  }

  // 2) 经 Supabase Edge 代理（解决阿里云 OSS 无 CORS 导致的 Load failed）
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

function triggerDirectUrlDownload(url: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/**
 * 将预览图保存到本地相册/下载目录。
 * 优先系统分享；拿不到文件时回退逐张下载（含 OSS 代理）。
 */
export async function saveImagesToAlbum(images: PreviewImageItem[]): Promise<void> {
  if (images.length === 0) {
    throw new Error('暂无图片可保存')
  }

  const files: File[] = []
  const failedIndexes: number[] = []
  const errors: string[] = []

  for (let index = 0; index < images.length; index += 1) {
    try {
      files.push(await fetchImageFile(images[index].src, index))
    } catch (error) {
      failedIndexes.push(index)
      errors.push(`第 ${index + 1} 张：${error instanceof Error ? error.message : '下载失败'}`)
    }
  }

  if (files.length > 0) {
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
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        // 分享失败则回退下载已拿到的文件
      }
    }

    for (let index = 0; index < files.length; index += 1) {
      triggerImageDownload(files[index])
      if (index < files.length - 1) {
        await sleep(350)
      }
    }
  }

  // 仍失败的：直接打开原始签名 URL（OSS 常带 Content-Disposition: attachment）
  for (const index of failedIndexes) {
    const src = images[index]?.src
    if (!src || src.startsWith('data:')) continue
    triggerDirectUrlDownload(src, `image-${String(index + 1).padStart(2, '0')}.jpg`)
    await sleep(350)
  }

  if (files.length === 0 && failedIndexes.length > 0) {
    // 已尝试直链下载，给出更明确的提示
    throw new Error(errors[0] || '图片下载失败')
  }

  if (errors.length > 0 && files.length > 0) {
    throw new Error(`已保存 ${files.length} 张；部分失败：${errors.join('；')}`)
  }
}

