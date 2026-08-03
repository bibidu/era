/** 将多张图片按顺序纵向拼成一张长图（统一宽度、默认无缝） */

export interface StitchImagesOptions {
  /** 图片间距（px），默认 0 */
  gapPx?: number
  /** 画布背景色；无缝且等宽时可忽略 */
  backgroundColor?: string
  /**
   * 目标宽度：默认取所有图中最宽的一侧；
   * 其余图按比例缩放到该宽度后再拼接。
   */
  targetWidth?: number
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    image.src = url
  })
}

export async function stitchImagesVertical(
  blobs: Blob[],
  options: StitchImagesOptions = {},
): Promise<Blob> {
  if (!blobs.length) throw new Error('没有可拼接的图片')
  if (blobs.length === 1) return blobs[0]

  const gapPx = Math.max(0, options.gapPx ?? 0)
  const backgroundColor = options.backgroundColor ?? '#FFFFFF'
  const images = await Promise.all(blobs.map((blob) => loadImageFromBlob(blob)))

  try {
    const maxNaturalWidth = Math.max(...images.map((img) => img.naturalWidth || img.width))
    const width = Math.max(1, Math.round(options.targetWidth ?? maxNaturalWidth))

    const scaledHeights = images.map((img) => {
      const iw = img.naturalWidth || img.width
      const ih = img.naturalHeight || img.height
      if (iw <= 0) return 0
      return Math.max(1, Math.round((ih * width) / iw))
    })

    const height =
      scaledHeights.reduce((sum, h) => sum + h, 0) + gapPx * (images.length - 1)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = Math.max(1, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 不可用')

    if (gapPx > 0) {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, width, height)
    }

    let y = 0
    for (let i = 0; i < images.length; i += 1) {
      const img = images[i]!
      const drawHeight = scaledHeights[i]!
      ctx.drawImage(img, 0, y, width, drawHeight)
      y += drawHeight + gapPx
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png', 1),
    )
    if (!blob) throw new Error('拼图生成失败')
    return blob
  } finally {
    // Image elements from blob URLs don't need close(); GC handles them
  }
}
