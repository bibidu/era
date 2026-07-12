export interface ImageSize {
  width: number
  height: number
}

export const DEFAULT_POSTER_ASPECT_RATIO = 3 / 4

export const DEFAULT_POSTER_SIZE: ImageSize = {
  width: 3,
  height: 4,
}

/** 在容器内等比缩放（object-contain） */
export function fitSizeInBox(content: ImageSize, box: ImageSize): ImageSize {
  if (!content.width || !content.height || !box.width || !box.height) {
    return { width: 0, height: 0 }
  }

  const contentRatio = content.width / content.height
  const boxRatio = box.width / box.height

  if (contentRatio > boxRatio) {
    const width = Math.floor(box.width)
    return { width, height: Math.floor(width / contentRatio) }
  }

  const height = Math.floor(box.height)
  return { width: Math.floor(height * contentRatio), height }
}

export function loadImageMeta(src: string): Promise<ImageSize> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

/** 读取图片真实显示尺寸（含 EXIF 方向纠正） */
export async function loadImageMetaFromFile(file: File): Promise<ImageSize> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    const url = URL.createObjectURL(file)
    try {
      return await loadImageMeta(url)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

export async function loadOrientedImageBitmap(src: string): Promise<ImageBitmap> {
  const response = await fetch(src)
  const blob = await response.blob()
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}
