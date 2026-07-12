export function loadImageMeta(src: string): Promise<{ width: number; height: number }> {
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

export const DEFAULT_POSTER_ASPECT_RATIO = 3 / 4
