/** 风水质感：偏蓝水色底图 + 透明雾色罩层（冷调宣纸，避免暖黄冲淡蓝色） */

export const FENGSHUI_CANVAS_COLOR = '#F0F5F8'
export const FENGSHUI_CANVAS_RGB = '240, 245, 248'

/** 底图不透明度：保留水色蓝调，同时不抢标题 */
export const FENGSHUI_IMAGE_OPACITY = 0.68

/** 顶部留白雾罩，方便大标题阅读（略轻，避免盖掉蓝色） */
export const FENGSHUI_TOP_MIST = `rgba(${FENGSHUI_CANVAS_RGB}, 0.5)`
export const FENGSHUI_MID_MIST = 'rgba(170, 190, 205, 0.08)'
export const FENGSHUI_SEPIA_WASH = 'rgba(180, 205, 220, 0.06)'

/** 资源版本：底图/参数更新后递增，避免浏览器缓存旧图 */
export const FENGSHUI_TEXTURE_VERSION = '20260722b'

export function resolveFengshuiTextureUrl() {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}textures/fengshui-bg.png?v=${FENGSHUI_TEXTURE_VERSION}`
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
) {
  const naturalWidth =
    'naturalWidth' in image && typeof image.naturalWidth === 'number'
      ? image.naturalWidth
      : width
  const naturalHeight =
    'naturalHeight' in image && typeof image.naturalHeight === 'number'
      ? image.naturalHeight
      : height
  const sourceRatio = naturalWidth / Math.max(1, naturalHeight)
  const targetRatio = width / height
  let sx = 0
  let sy = 0
  let sw = naturalWidth
  let sh = naturalHeight

  if (sourceRatio > targetRatio) {
    sw = naturalHeight * targetRatio
    sx = (naturalWidth - sw) / 2
  } else {
    sh = naturalWidth / targetRatio
    sy = (naturalHeight - sh) / 2
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height)
}

function drawMistWashes(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // 顶部淡雾：标题区可读，同时保留水色蓝调
  const top = ctx.createLinearGradient(0, 0, 0, height * 0.58)
  top.addColorStop(0, `rgba(${FENGSHUI_CANVAS_RGB}, 0.5)`)
  top.addColorStop(0.55, `rgba(${FENGSHUI_CANVAS_RGB}, 0.16)`)
  top.addColorStop(1, `rgba(${FENGSHUI_CANVAS_RGB}, 0)`)
  ctx.fillStyle = top
  ctx.fillRect(0, 0, width, height)

  // 中部极淡青灰雾
  const mid = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    width * 0.05,
    width * 0.5,
    height * 0.42,
    width * 0.7,
  )
  mid.addColorStop(0, 'rgba(170, 190, 205, 0.08)')
  mid.addColorStop(1, 'rgba(170, 190, 205, 0)')
  ctx.fillStyle = mid
  ctx.fillRect(0, 0, width, height)

  // 底部微弱冷青罩，强化水色而不偏暖黄
  const bottom = ctx.createLinearGradient(0, height * 0.55, 0, height)
  bottom.addColorStop(0, 'rgba(180, 205, 220, 0)')
  bottom.addColorStop(1, 'rgba(180, 205, 220, 0.06)')
  ctx.fillStyle = bottom
  ctx.fillRect(0, 0, width, height)
}

/**
 * 导出用：先铺冷调宣纸底，再淡绘水色参考图，最后加透明雾色。
 * stacked=true 时不铺底色，只叠淡图与雾罩。
 */
export async function drawPageFengshuiOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stacked: boolean,
  loadImage: (src: string) => Promise<HTMLImageElement>,
) {
  if (!stacked) {
    ctx.fillStyle = FENGSHUI_CANVAS_COLOR
    ctx.fillRect(0, 0, width, height)
  }

  try {
    const image = await loadImage(resolveFengshuiTextureUrl())
    ctx.save()
    ctx.globalAlpha = FENGSHUI_IMAGE_OPACITY
    drawCoverImage(ctx, image, width, height)
    ctx.restore()
  } catch {
    // 底图缺失时退化为 procedural 淡山轮廓
    drawProceduralFengshuiFallback(ctx, width, height)
  }

  drawMistWashes(ctx, width, height)
}

function drawProceduralFengshuiFallback(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.fillStyle = 'rgba(150, 175, 195, 0.14)'
  ctx.beginPath()
  ctx.moveTo(0, height * 0.48)
  ctx.quadraticCurveTo(width * 0.22, height * 0.34, width * 0.4, height * 0.46)
  ctx.quadraticCurveTo(width * 0.62, height * 0.3, width * 0.82, height * 0.44)
  ctx.lineTo(width, height * 0.5)
  ctx.lineTo(width, height * 0.62)
  ctx.lineTo(0, height * 0.62)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = 'rgba(140, 168, 190, 0.12)'
  ctx.beginPath()
  ctx.moveTo(0, height * 0.58)
  ctx.quadraticCurveTo(width * 0.3, height * 0.48, width * 0.55, height * 0.58)
  ctx.quadraticCurveTo(width * 0.78, height * 0.5, width, height * 0.6)
  ctx.lineTo(width, height * 0.72)
  ctx.lineTo(0, height * 0.72)
  ctx.closePath()
  ctx.fill()
}
