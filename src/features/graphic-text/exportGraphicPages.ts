import { GRAPHIC_EXPORT_SCALE, GRAPHIC_PAGE_SIZE } from './layout'
import type { GraphicTextConfig, GraphicTextPage, MarkdownBlock } from './types'
import { FONT_OPTIONS } from '../../data/fonts'
import { ensureFontReady } from '../../utils/fontLoad'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('参考图加载失败'))
    image.src = src
  })
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const sourceRatio = image.naturalWidth / image.naturalHeight
  const targetRatio = width / height
  let sx = 0
  let sy = 0
  let sw = image.naturalWidth
  let sh = image.naturalHeight

  if (sourceRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio
    sx = (image.naturalWidth - sw) / 2
  } else {
    sh = image.naturalWidth / targetRatio
    sy = (image.naturalHeight - sh) / 2
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  let line = ''

  for (const character of [...text]) {
    const next = line + character
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = character
    } else {
      line = next
    }
  }

  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function blockSpec(block: MarkdownBlock, config: GraphicTextConfig) {
  if (block.type === 'title') {
    return {
      size: config.titleFontSize * GRAPHIC_EXPORT_SCALE,
      weight: 700,
      lineHeight: 1.22,
      spacing: 0.8,
    }
  }
  if (block.type === 'heading') {
    return {
      size: Math.round(config.titleFontSize * 0.72 * GRAPHIC_EXPORT_SCALE),
      weight: 700,
      lineHeight: 1.35,
      spacing: 0.65,
    }
  }
  return {
    size: config.bodyFontSize * GRAPHIC_EXPORT_SCALE,
    weight: 400,
    lineHeight: 1.55,
    spacing: 0.55,
  }
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  style: GraphicTextConfig['topStyle'],
  x: number,
  y: number,
  width: number,
  height: number,
  themeColor: string,
) {
  if (style === 'bar') {
    ctx.fillStyle = themeColor
    roundedRect(ctx, x, y, width, height, 14)
    ctx.fill()
  } else if (style === 'outline') {
    ctx.fillStyle = 'rgba(255,255,255,.86)'
    ctx.strokeStyle = '#171717'
    ctx.lineWidth = 3
    roundedRect(ctx, x, y, width, height, 12)
    ctx.fill()
    ctx.stroke()
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.78)'
    roundedRect(ctx, x, y, width, height, 12)
    ctx.fill()
  }
}

async function drawPage(
  page: GraphicTextPage,
  config: GraphicTextConfig,
): Promise<Blob> {
  const { width, height, safeX, safeTop, safeBottom } = GRAPHIC_PAGE_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')

  ctx.fillStyle = '#FBF7ED'
  ctx.fillRect(0, 0, width, height)

  if (config.template === 'reference' && config.backgroundUrl) {
    const image = await loadImage(config.backgroundUrl)
    drawCoverImage(ctx, image, width, height)
    ctx.fillStyle = 'rgba(255,255,255,.82)'
    ctx.fillRect(0, 0, width, height)
  } else if (config.template === 'grid') {
    ctx.strokeStyle = 'rgba(23,23,23,.055)'
    ctx.lineWidth = 1
    for (let x = 0; x <= width; x += 35) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += 35) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }

  const edgeX = safeX
  const edgeWidth = width - safeX * 2
  drawEdge(ctx, config.topStyle, edgeX, 60, edgeWidth, 86, config.themeColor)
  ctx.fillStyle = '#171717'
  ctx.font = `600 28px ${config.fontFamily}`
  ctx.textBaseline = 'middle'
  ctx.fillText(config.topText || '图文笔记', edgeX + 28, 103, edgeWidth - 130)

  ctx.fillStyle = '#171717'
  roundedRect(ctx, width - safeX - 78, 78, 52, 50, 25)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `600 20px ${config.fontFamily}`
  ctx.textAlign = 'center'
  ctx.fillText(String(page.index + 1).padStart(2, '0'), width - safeX - 52, 103)
  ctx.textAlign = 'left'

  let y = safeTop
  const maxWidth = width - safeX * 2
  for (const block of page.blocks) {
    const spec = blockSpec(block, config)
    const quoteInset = block.type === 'quote' ? 42 : 0
    const listInset = block.type === 'list' ? spec.size * 1.35 : 0
    ctx.font = `${spec.weight} ${spec.size}px ${config.fontFamily}`
    ctx.textBaseline = 'top'
    const lines = wrapText(ctx, block.text, maxWidth - quoteInset - listInset)
    const lineHeight = spec.size * spec.lineHeight

    if (block.type === 'quote') {
      const quoteHeight = lines.length * lineHeight + 24
      ctx.fillStyle = 'rgba(255,255,255,.72)'
      ctx.fillRect(safeX, y - 8, maxWidth, quoteHeight)
      ctx.fillStyle = config.themeColor
      ctx.fillRect(safeX, y - 8, 8, quoteHeight)
    }

    lines.forEach((line, lineIndex) => {
      if (block.type === 'list' && lineIndex === 0) {
        ctx.fillStyle = config.themeColor
        ctx.fillRect(safeX, y + lineHeight * 0.42, 13, 13)
      }
      ctx.fillStyle = '#171717'
      ctx.fillText(line, safeX + quoteInset + listInset, y)
      y += lineHeight
    })
    y += spec.size * spec.spacing
  }

  drawEdge(ctx, config.bottomStyle, edgeX, height - safeBottom + 56, edgeWidth, 68, config.themeColor)
  ctx.fillStyle = '#171717'
  ctx.font = `400 22px ${config.fontFamily}`
  ctx.textBaseline = 'middle'
  ctx.fillText(config.bottomText || '滑动查看下一页', edgeX + 28, height - safeBottom + 90)
  ctx.textAlign = 'right'
  ctx.fillText(String(page.index + 1), width - safeX - 28, height - safeBottom + 90)
  ctx.textAlign = 'left'

  ctx.fillStyle = config.themeColor
  ctx.fillRect(34, 34, 16, 16)
  ctx.fillStyle = '#171717'
  ctx.fillRect(width - 64, height - 50, 10, 10)
  ctx.fillStyle = config.themeColor
  ctx.fillRect(width - 46, height - 50, 10, 10)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1))
  if (!blob) throw new Error('页面生成失败')
  return blob
}

export async function exportGraphicPages(
  pages: GraphicTextPage[],
  config: GraphicTextConfig,
  onProgress?: (current: number, total: number) => void,
) {
  const font = FONT_OPTIONS.find((item) => item.id === config.fontId)
  if (font && font.source !== 'system') {
    const sample = pages.flatMap((page) => page.blocks.map((block) => block.text)).join('')
    await ensureFontReady(font, sample || font.sample)
  }

  const blobs: Blob[] = []
  for (let index = 0; index < pages.length; index += 1) {
    blobs.push(await drawPage(pages[index], config))
    onProgress?.(index + 1, pages.length)
    await new Promise((resolve) => window.setTimeout(resolve, 16))
  }
  return blobs
}

export async function saveGraphicPages(blobs: Blob[]) {
  const files = blobs.map(
    (blob, index) =>
      new File([blob], `graphic-page-${String(index + 1).padStart(2, '0')}.png`, {
        type: 'image/png',
      }),
  )

  if (navigator.share && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title: '图文页面' })
      return
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
    }
  }

  for (const file of files) {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    link.remove()
    await new Promise((resolve) => window.setTimeout(resolve, 250))
    URL.revokeObjectURL(url)
  }
}
