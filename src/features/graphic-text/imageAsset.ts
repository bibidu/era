import type { GraphicAsset } from './document'
import { createAssetId } from './document'

const MAX_IMAGE_EDGE = 1600
const JPEG_QUALITY = 0.86

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片读取失败'))
    }
    image.src = url
  })
}

function canvasToDataUrl(canvas: HTMLCanvasElement) {
  if (canvas.toDataURL('image/jpeg', JPEG_QUALITY).length < canvas.toDataURL('image/png').length) {
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  }
  return canvas.toDataURL('image/png')
}

export async function fileToGraphicAsset(file: File): Promise<GraphicAsset> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }

  const image = await loadImageFromFile(file)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法处理图片')
  ctx.drawImage(image, 0, 0, width, height)

  return {
    id: createAssetId(),
    url: canvasToDataUrl(canvas),
    width,
    height,
    name: file.name,
  }
}

export function measureImageLayoutSize(
  asset: GraphicAsset,
  contentWidth: number,
  maxHeight: number,
  fit: 'width' | 'contain' = 'width',
) {
  let width = contentWidth
  let height = (contentWidth * asset.height) / asset.width

  if (fit === 'contain') {
    const containScale = Math.min(contentWidth / asset.width, maxHeight / asset.height, 1)
    width = asset.width * containScale
    height = asset.height * containScale
  } else if (height > maxHeight) {
    height = maxHeight
    width = (maxHeight * asset.width) / asset.height
  }

  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  }
}
