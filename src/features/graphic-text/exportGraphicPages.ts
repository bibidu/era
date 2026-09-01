import {
  CODE_BACKGROUND,
  CODE_AFTER_GAP,
  CODE_BODY_PAD,
  CODE_CHROME_BG,
  CODE_CHROME_HEIGHT,
  CODE_CHROME_TITLE_COLOR,
  CODE_CHROME_TITLE_SIZE,
  CODE_DOT_OPACITY,
  CODE_DOT_SIZE,
  CODE_DOTS,
  CODE_CHROME_GAP,
  CODE_CHROME_PAD_X,
  CODE_RADIUS,
  codeBodyPadPx,
  codePx,
  resolveCodeBlockTitle,
} from './codeBlock'
import { CODE_TOKEN_COLORS, CODE_TOKEN_FONTS, GITHUB_CODE_FONT, prefixChineseCodeLine, tokenizeJavaScript } from './codeHighlight'
import {
  GRAPHIC_LIST_BULLET_COLOR,
  GRAPHIC_PAGE_TEXT_COLOR,
  GRAPHIC_TOP_BAR_DIVIDER_COLOR,
  GRAPHIC_TOP_BAR_TEXT_COLOR,
} from './graphicContentColors'
import { buildCircleHighlightColorRuns, drawHandDrawnCircleAroundTextBounds, HAND_DRAWN_CIRCLE_STROKE_WIDTH } from './circleHighlight'
import { drawHandDrawnUnderline, buildHandUnderlineColorRuns, HAND_DRAWN_UNDERLINE_TILE_WIDTH } from './handDrawnUnderlinePath'
import { collectGraphicFontIds, getFontConfigForStyleType, resolveLatinFamily } from './graphicTextFonts'
import { fillMixedText, measureMixedText } from './mixedScript'
import { getGraphicLayout, resolveTitleFontSize } from './layout'
import type { GraphicTextConfig, GraphicTextPage, MarkdownBlock } from './types'
import { getFontById } from '../../data/fonts'
import { ensureFontReady, ensureFontsReadyForExport } from '../../utils/fontLoad'
import { buildCharHighlightColorSegments, stripHighlightMarkers, themeAlpha } from './inlineHighlight'
import { blockHasHighlightInMap, resolveBlockHighlightColor } from './highlightColors'
import { TOP_BAR_FONT_SIZE_PX } from './graphicPreviewLayout'
import {
  drawPageGridOverlay,
  resolvePageBaseFillColor,
} from './pageBackground'
import {
  drawPageFengshuiOverlay,
  FENGSHUI_TOP_BAR_TEXT_COLOR,
} from './pageFengshuiTokens'
import { drawPageGradientBackground } from './pageGradientTokens'
import { drawPagePixelOverlay } from './pagePixelTokens'
import { drawPageWiremeshOverlay } from './pageWiremeshTokens'
import {
  shouldDrawBaseBackground,
  shouldDrawPageOverlay,
  shouldDrawReferenceBackground,
} from './pageLayering'
import { isSeriesLabelPage, resolveTopBarBorderColor, resolveTopBarParts } from './topBar'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('参考图加载失败'))
    image.src = src
  })
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

interface LineSegment {
  text: string
  color: string | null
}

function drawStyledLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  blockId: string,
  charOffset: number,
  brushSegments: LineSegment[],
  underlineSegments: LineSegment[],
  handUnderlineColors: Readonly<Record<string, string>>,
  handUnderlineTileWidth: number,
  circleColors: Readonly<Record<string, string>>,
  x: number,
  yTop: number,
  fontSize: number,
  enableHighlight: boolean,
  textColor: string,
  circleLineWidth: number,
  textColorSegments: LineSegment[] = [],
  fontWeight: number | string = 400,
  fontFamily = 'sans-serif',
) {
  const paddingX = 4
  const plainText = stripHighlightMarkers(text)
  ctx.textBaseline = 'alphabetic'
  const measure = (value: string) => measureMixedText(ctx, value, fontWeight, fontSize, fontFamily)
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  const textMetrics = ctx.measureText(plainText || '文')
  const ascent = textMetrics.actualBoundingBoxAscent ?? fontSize * 0.88
  const descent = textMetrics.actualBoundingBoxDescent ?? fontSize * 0.12
  const baselineY = yTop + ascent
  const underlineY = baselineY + fontSize * 0.18

  if (enableHighlight) {
    let bgX = x
    for (const segment of brushSegments) {
      if (!segment.text) continue
      const width = measure(segment.text)
      if (segment.color) {
        ctx.fillStyle = themeAlpha(segment.color, 0.28)
        ctx.fillRect(bgX - paddingX, yTop, width + paddingX * 2, ascent + descent + 4)
      }
      bgX += width
    }
  }

  if (enableHighlight && textColorSegments.some((segment) => segment.color)) {
    let drawX = x
    for (const segment of textColorSegments) {
      if (!segment.text) continue
      ctx.fillStyle = segment.color || textColor
      drawX += fillMixedText(ctx, segment.text, drawX, baselineY, fontWeight, fontSize, fontFamily)
    }
  } else {
    ctx.fillStyle = textColor
    fillMixedText(ctx, plainText, x, baselineY, fontWeight, fontSize, fontFamily)
  }

  if (enableHighlight) {
    const circleRuns = buildCircleHighlightColorRuns(plainText, blockId, charOffset, circleColors)
    for (const run of circleRuns) {
      const prefix = plainText.slice(0, run.start)
      const runX = x + measure(prefix)
      const runWidth = measure(run.text)
      drawHandDrawnCircleAroundTextBounds(
        ctx,
        runX,
        yTop,
        runWidth,
        ascent,
        descent,
        run.color,
        fontSize,
        Math.max(HAND_DRAWN_CIRCLE_STROKE_WIDTH, circleLineWidth),
      )
    }

    let underlineX = x
    for (const segment of underlineSegments) {
      if (!segment.text) continue
      const width = measure(segment.text)
      if (segment.color) {
        ctx.strokeStyle = segment.color
        ctx.lineWidth = Math.max(4, fontSize * 0.12)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(underlineX, underlineY)
        ctx.lineTo(underlineX + width, underlineY)
        ctx.stroke()
      }
      underlineX += width
    }

    const handRuns = buildHandUnderlineColorRuns(plainText, blockId, charOffset, handUnderlineColors)
    for (const run of handRuns) {
      const prefix = plainText.slice(0, run.start)
      const runX = x + measure(prefix)
      const runWidth = measure(run.text)
      drawHandDrawnUnderline(
        ctx,
        runX,
        underlineY,
        runWidth,
        run.color,
        Math.max(3, fontSize * 0.08),
        handUnderlineTileWidth,
      )
    }
  }
}

function resolveStyleType(block: MarkdownBlock) {
  return block.styleType ?? block.type
}

function blockSpec(block: MarkdownBlock, config: GraphicTextConfig, exportScale: number) {
  const styleType = resolveStyleType(block)
  const { fontFamily } = getFontConfigForStyleType(config, styleType)
  if (styleType === 'title') {
    const titleSize = resolveTitleFontSize(block, config)
    return {
      size: titleSize * exportScale,
      weight: 700,
      lineHeight: config.titleLineHeight,
      spacing: config.titleMarginBottom,
      marginBefore: config.titleMarginTop,
      fontFamily,
    }
  }
  if (styleType === 'heading') {
    return {
      size: Math.round(config.headingFontSize * exportScale),
      weight: 700,
      lineHeight: config.headingLineHeight,
      spacing: config.headingMarginBottom,
      marginBefore: config.headingMarginTop,
      fontFamily,
    }
  }
  if (styleType === 'quote') {
    return {
      size: config.bodyFontSize * exportScale,
      weight: 700,
      lineHeight: config.bodyLineHeight,
      spacing: 0.08,
      marginBefore: 0,
      fontFamily,
    }
  }
  if (styleType === 'code') {
    return {
      size: Math.round(config.codeFontSize * exportScale),
      weight: 400,
      lineHeight: config.codeLineHeight,
      spacing: 0.08,
      marginBefore: 0,
      fontFamily,
    }
  }
  return {
    size: config.bodyFontSize * exportScale,
    weight: 400,
    lineHeight: config.bodyLineHeight,
    spacing: 0.08,
    marginBefore: 0,
    fontFamily,
  }
}

async function ensureLatinFontReady(config: GraphicTextConfig) {
  if (typeof document === 'undefined' || !document.fonts) return
  const name = resolveLatinFamily(config).split(',')[0].replace(/"/g, '').trim()
  const sample = 'Agent AGENTS.md skill'
  await Promise.all([
    document.fonts.load(`400 24px "${name}"`, sample),
    document.fonts.load(`700 24px "${name}"`, sample),
  ])
  await document.fonts.ready
}

const NOTO_CJK_FAMILY = 'Noto Sans CJK JP'
const NOTO_CJK_TTC = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
let notoCjkFaceRegistered = false

function measureHanWidth(family: string) {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return 0
  ctx.font = `400 64px ${family}`
  return ctx.measureText('汉').width
}

async function registerSystemNotoCjkFace() {
  if (typeof FontFace === 'undefined' || typeof document === 'undefined') return false
  if (notoCjkFaceRegistered) return true

  const sources = [
    `local("${NOTO_CJK_FAMILY}")`,
    `local("Noto Sans CJK SC")`,
    `url("${import.meta.env.BASE_URL}fonts/NotoSansCJK-Regular.ttc")`,
    `url("file://${NOTO_CJK_TTC}")`,
  ]

  for (const source of sources) {
    try {
      const face = new FontFace(NOTO_CJK_FAMILY, source, { weight: '400', style: 'normal' })
      const loaded = await face.load()
      document.fonts.add(loaded)
      notoCjkFaceRegistered = true
      return true
    } catch {
      // try next source
    }
  }
  return false
}

async function ensureLiberationMonoStylesheet() {
  if (typeof document === 'undefined') return
  const href = `${import.meta.env.BASE_URL}fonts/liberation-mono.css`
  if (document.querySelector(`link[data-font-id="liberation-mono"], link[href="${href}"]`)) return
  await new Promise<void>((resolve) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.dataset.fontId = 'liberation-mono'
    link.onload = () => resolve()
    link.onerror = () => resolve()
    document.head.appendChild(link)
  })
}

async function ensureCodeExportFonts() {
  if (typeof document === 'undefined' || !document.fonts) return

  await ensureLiberationMonoStylesheet()
  await document.fonts.load('400 24px "Liberation Mono"', '0123456789ABCDefgh //')
  await document.fonts.load(`400 24px ${GITHUB_CODE_FONT}`, '0123456789ABCDefgh //汉字复述')
  await document.fonts.load(`400 24px "${NOTO_CJK_FAMILY}"`, '汉字复述').catch(() => undefined)

  const stackHan = measureHanWidth(GITHUB_CODE_FONT)
  const liberationHan = measureHanWidth('"Liberation Mono"')
  const tofu = stackHan > 0 && liberationHan > 0 && Math.abs(stackHan - liberationHan) < 0.5
  if (tofu) {
    await registerSystemNotoCjkFace()
    await document.fonts.load(`400 24px "${NOTO_CJK_FAMILY}"`, '汉字复述').catch(() => undefined)
  }
  await document.fonts.ready
}

function codeTokenFontFamily(kind: keyof typeof CODE_TOKEN_FONTS) {
  const family = CODE_TOKEN_FONTS[kind]
  return notoCjkFaceRegistered ? `${family}, "${NOTO_CJK_FAMILY}"` : family
}

async function drawPage(
  page: GraphicTextPage,
  config: GraphicTextConfig,
  markdown: string,
): Promise<Blob> {
  await ensureLatinFontReady(config)
  await ensureCodeExportFonts()
  const layout = getGraphicLayout(config, { pageIndex: page.index })
  const {
    pageWidth: width,
    pageHeight: height,
    safeX,
    safeTop,
    topBarY,
    topBarHeight,
    exportScale,
  } = layout
  const brushColors = config.brushHighlightColors ?? {}
  const underlineColors = config.underlineHighlightColors
  const handUnderlineColors = config.handUnderlineHighlightColors ?? {}
  const quoteColors = config.quoteHighlightColors
  const circleColors = config.circleHighlightColors
  const textColors = config.colorHighlightColors ?? {}
  const accentColor = config.highlightPickerColor
  const topBar = resolveTopBarParts(config, markdown, page.index)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')

  if (shouldDrawBaseBackground(config)) {
    ctx.fillStyle = resolvePageBaseFillColor(config)
    ctx.fillRect(0, 0, width, height)

    if (shouldDrawReferenceBackground(config) && config.backgroundUrl) {
      const image = await loadImage(config.backgroundUrl)
      drawCoverImage(ctx, image, width, height)
      // 中上偏实、底部偏透：保留左下/右下角意象，同时保证正文可读
      const wash = ctx.createLinearGradient(0, 0, 0, height)
      wash.addColorStop(0, 'rgba(255,255,255,0.58)')
      wash.addColorStop(0.52, 'rgba(255,255,255,0.7)')
      wash.addColorStop(0.78, 'rgba(255,255,255,0.42)')
      wash.addColorStop(1, 'rgba(255,255,255,0.18)')
      ctx.fillStyle = wash
      ctx.fillRect(0, 0, width, height)
    }
  } else if (config.pageOverlay === 'gradient') {
    drawPageGradientBackground(ctx, width, height, config.gradientVariant)
  } else if (config.pageOverlay === 'pixel') {
    drawPagePixelOverlay(ctx, width, height, false)
  } else if (config.pageOverlay === 'wiremesh') {
    drawPageWiremeshOverlay(ctx, width, height, false)
  } else if (config.pageOverlay === 'fengshui') {
    await drawPageFengshuiOverlay(ctx, width, height, false, loadImage)
  }

  if (shouldDrawPageOverlay(config) && config.pageOverlay === 'grid') {
    drawPageGridOverlay(ctx, width, height)
  }

  if (shouldDrawPageOverlay(config) && config.pageOverlay === 'pixel' && config.overlayStacked) {
    drawPagePixelOverlay(ctx, width, height, true)
  }

  if (shouldDrawPageOverlay(config) && config.pageOverlay === 'wiremesh' && config.overlayStacked) {
    drawPageWiremeshOverlay(ctx, width, height, true)
  }

  // 已用 reference 诗意/自定义底图时，不再叠风水村舍纹理，只保留风水顶栏与排版气质
  if (
    shouldDrawPageOverlay(config) &&
    config.pageOverlay === 'fengshui' &&
    config.overlayStacked &&
    !shouldDrawReferenceBackground(config)
  ) {
    await drawPageFengshuiOverlay(ctx, width, height, true, loadImage)
  }

  if (shouldDrawPageOverlay(config) && config.pageOverlay === 'gradient' && config.overlayStacked) {
    drawPageGradientBackground(ctx, width, height, config.gradientVariant)
  }

  const edgeX = safeX
  const edgeWidth = width - safeX * 2
  const underlineY = topBarY + topBarHeight - 6

  const isFengshui = config.pageOverlay === 'fengshui'
  const seriesTopBar = isSeriesLabelPage(config, page.index)
  const topBarLineColor = resolveTopBarBorderColor(config, page.index)
  const topBarTextColor = isFengshui ? FENGSHUI_TOP_BAR_TEXT_COLOR : GRAPHIC_TOP_BAR_TEXT_COLOR
  const topBarDividerColor = GRAPHIC_TOP_BAR_DIVIDER_COLOR

  ctx.fillStyle = topBarTextColor
  const topBarFontSize = Math.round(TOP_BAR_FONT_SIZE_PX * exportScale)
  ctx.font = `400 ${topBarFontSize}px ${config.bodyFontFamily}`
  ctx.textBaseline = 'bottom'
  const topBarTextY = underlineY - 8
  const measureSample = topBar.countText || topBar.custom || '文'
  const topBarMetrics = ctx.measureText(measureSample)
  const topBarAscent = topBarMetrics.actualBoundingBoxAscent ?? topBarFontSize * 0.85
  const topBarDescent = topBarMetrics.actualBoundingBoxDescent ?? topBarFontSize * 0.15
  const topBarMidY = topBarTextY - (topBarAscent + topBarDescent) / 2

  // 系列期数顶栏：朱红线只划到文字结束；其余顶栏仍整行底边
  let topBarLineWidth = edgeWidth
  if (seriesTopBar && topBar.custom) {
    topBarLineWidth = Math.min(edgeWidth, ctx.measureText(topBar.custom).width)
  }
  ctx.strokeStyle = topBarLineColor
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(edgeX, underlineY)
  ctx.lineTo(edgeX + topBarLineWidth, underlineY)
  ctx.stroke()

  if (topBar.custom && topBar.countText) {
    const gap = Math.max(6, Math.round(8 * exportScale))
    const dividerWidth = Math.max(1, Math.round(exportScale))
    const dividerHeight = Math.round(topBarFontSize * 0.85)
    const countWidth = ctx.measureText(topBar.countText).width
    const customMaxWidth = edgeWidth - countWidth - gap * 2 - dividerWidth
    let customText = topBar.custom
    while (customText.length > 1 && ctx.measureText(`${customText}…`).width > customMaxWidth) {
      customText = customText.slice(0, -1)
    }
    if (customText !== topBar.custom) customText += '…'
    const customWidth = ctx.measureText(customText).width
    ctx.fillText(customText, edgeX, topBarTextY)
    const dividerX = edgeX + customWidth + gap
    ctx.fillStyle = topBarDividerColor
    ctx.fillRect(dividerX, topBarMidY - dividerHeight / 2, dividerWidth, dividerHeight)
    ctx.fillStyle = topBarTextColor
    ctx.fillText(topBar.countText, dividerX + gap + dividerWidth, topBarTextY)
  } else if (topBar.custom) {
    ctx.fillText(topBar.custom, edgeX, topBarTextY, edgeWidth)
  } else if (topBar.countText) {
    ctx.fillText(topBar.countText, edgeX, topBarTextY, edgeWidth)
  }

  let y = safeTop
  const listInset = (size: number) => size * 1.35
  const quoteInset = (size: number) => size * 0.55
  const codeInset = () => codeBodyPadPx(width)
  const blockGap = width * 0.011
  let codeBlockSourceId: string | null = null

  const circleLineWidth = Math.max(
    HAND_DRAWN_CIRCLE_STROKE_WIDTH,
    HAND_DRAWN_CIRCLE_STROKE_WIDTH * exportScale,
  )

  const drawCodeWindow = (x: number, frameY: number, w: number, h: number, title: string) => {
    const radius = codePx(width, CODE_RADIUS)
    const chromeH = codePx(width, CODE_CHROME_HEIGHT)
    const dotSize = codePx(width, CODE_DOT_SIZE)
    const titleSize = codePx(width, CODE_CHROME_TITLE_SIZE)

    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = codePx(width, 80)
    ctx.shadowOffsetY = codePx(width, 30)
    ctx.beginPath()
    ctx.roundRect(x, frameY, w, h, radius)
    ctx.fillStyle = CODE_BACKGROUND
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, frameY, w, h, radius)
    ctx.clip()
    ctx.fillStyle = config.codeBackgroundColor || CODE_BACKGROUND
    ctx.fillRect(x, frameY, w, h)
    ctx.fillStyle = CODE_CHROME_BG
    ctx.fillRect(x, frameY, w, chromeH)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = Math.max(1, codePx(width, 1))
    ctx.beginPath()
    ctx.moveTo(x, frameY + chromeH)
    ctx.lineTo(x + w, frameY + chromeH)
    ctx.stroke()

    const dotY = frameY + chromeH / 2
    const dotR = dotSize / 2
    const dotGap = codePx(width, CODE_CHROME_GAP)
    const dotStart = x + codePx(width, CODE_CHROME_PAD_X) + dotR
    ctx.globalAlpha = CODE_DOT_OPACITY
    CODE_DOTS.forEach((color, i) => {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(dotStart + i * (dotSize + dotGap), dotY, dotR, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1

    ctx.restore()

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = Math.max(1, codePx(width, 1))
    ctx.beginPath()
    ctx.roundRect(x, frameY, w, h, radius)
    ctx.stroke()
  }

  const flushCodeBlockFrame = () => {
  }

  for (const block of page.blocks) {
    const styleType = resolveStyleType(block)

    if (styleType === 'image') {
      flushCodeBlockFrame()
      codeBlockSourceId = null
      if (block.imageUrl && block.imageWidth && block.imageHeight) {
        const image = await loadImage(block.imageUrl)
        const contentWidth = width - safeX * 2
        const drawWidth = block.imageWidth
        const drawHeight = block.imageHeight
        const x = safeX + (contentWidth - drawWidth) / 2
        ctx.drawImage(image, x, y, drawWidth, drawHeight)
        y += drawHeight
      }
      if (block.isBlockEnd) {
        y += config.bodyFontSize * exportScale * (0.08 + 0.18) + blockGap
      }
      continue
    }

    const spec = blockSpec(block, config, exportScale)
    if (block.type === 'title' || block.type === 'heading') {
      y += spec.size * spec.marginBefore
    }

    const measureFamily = styleType === 'code' ? GITHUB_CODE_FONT : spec.fontFamily
    ctx.font = `${spec.weight} ${spec.size}px ${measureFamily}`
    const plainText = stripHighlightMarkers(block.text)
    const blockId = block.sourceBlockId ?? block.id
    const charOffset = block.charOffset ?? 0
    const hasQuoteHighlightBar = blockHasHighlightInMap(block, quoteColors)
    const quoteColor = resolveBlockHighlightColor(block, quoteColors)
    const quoteBarInset = hasQuoteHighlightBar ? quoteInset(spec.size) : 0
    const inset =
      block.type === 'list'
        ? listInset(spec.size) + quoteBarInset
        : block.type === 'code' || styleType === 'code'
          ? codeInset()
          : quoteBarInset
    const enableHighlight = true
    const brushSegments = enableHighlight
      ? buildCharHighlightColorSegments(block.text, blockId, brushColors, charOffset)
      : [{ text: plainText, color: null }]
    const underlineSegments = enableHighlight
      ? buildCharHighlightColorSegments(block.text, blockId, underlineColors, charOffset)
      : [{ text: plainText, color: null }]
    const textColorSegments = enableHighlight
      ? buildCharHighlightColorSegments(block.text, blockId, textColors, charOffset)
      : [{ text: plainText, color: null }]
    const lineHeight = spec.size * spec.lineHeight
    const textMetrics = ctx.measureText(plainText || '文')
    const ascent = textMetrics.actualBoundingBoxAscent ?? spec.size * 0.88

    if (styleType === 'code') {
      const bgX = safeX
      const bgW = width - safeX * 2
      const chromeH = codePx(width, CODE_CHROME_HEIGHT)
      const bodyPad = codePx(width, CODE_BODY_PAD)

      if (codeBlockSourceId !== blockId) {
        flushCodeBlockFrame()
        codeBlockSourceId = blockId
        let lineCount = 0
        const startIndex = page.blocks.indexOf(block)
        for (let i = startIndex; i < page.blocks.length; i += 1) {
          const next = page.blocks[i]
          const nextStyle = resolveStyleType(next)
          const nextId = next.sourceBlockId ?? next.id
          if (nextStyle === 'code' && nextId === blockId) lineCount += 1
          else break
        }
        const frameH = chromeH + bodyPad + lineCount * lineHeight + bodyPad
        drawCodeWindow(bgX, y, bgW, frameH, resolveCodeBlockTitle(block.codeFenceInfo))
        y += chromeH + bodyPad
      }
    } else {
      flushCodeBlockFrame()
      codeBlockSourceId = null
    }

    if (block.type === 'list') {
      const bulletRadius = spec.size * 0.16
      const centerY = y + ascent * 0.48
      ctx.fillStyle = GRAPHIC_LIST_BULLET_COLOR
      ctx.beginPath()
      ctx.arc(safeX + quoteBarInset + bulletRadius * 2, centerY, bulletRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    if (hasQuoteHighlightBar && quoteColor) {
      const barWidth = Math.max(4, spec.size * 0.18)
      ctx.fillStyle = quoteColor
      ctx.fillRect(safeX, y, barWidth, lineHeight)
    }

    // 有 titlePrimaryColor 时整段一级标题（含换行次行）同色，供风水 skill 朱红标题等
    const titlePrimary =
      styleType === 'title' && config.titlePrimaryColor?.trim()
        ? config.titlePrimaryColor
        : null
    if (styleType === 'code') {
      const tokens = tokenizeJavaScript(prefixChineseCodeLine(plainText))
      ctx.textBaseline = 'alphabetic'
      const baselineY = y + ascent
      let drawX = safeX + inset
      for (const token of tokens) {
        const family = codeTokenFontFamily(token.kind)
        ctx.font = `${spec.weight} ${spec.size}px ${family}`
        ctx.fillStyle = CODE_TOKEN_COLORS[token.kind]
        ctx.fillText(token.text, drawX, baselineY)
        drawX += ctx.measureText(token.text).width
      }
    } else {
      drawStyledLine(
        ctx,
        block.text,
        blockId,
        charOffset,
        brushSegments,
        underlineSegments,
        handUnderlineColors,
        HAND_DRAWN_UNDERLINE_TILE_WIDTH * exportScale,
        circleColors,
        safeX + inset,
        y,
        spec.size,
        enableHighlight,
        titlePrimary || GRAPHIC_PAGE_TEXT_COLOR,
        circleLineWidth,
        textColorSegments,
        spec.weight,
        spec.fontFamily,
      )
    }
    y += lineHeight

    if (styleType === 'code' && block.isBlockEnd) {
      y += codePx(width, CODE_BODY_PAD) + codePx(width, CODE_AFTER_GAP)
      flushCodeBlockFrame()
      codeBlockSourceId = null
    }

    if (block.isBlockEnd) {
      y += spec.size * (spec.spacing + 0.18) + blockGap
    }
  }

  ctx.fillStyle = accentColor
  ctx.fillRect(34, 34, 16, 16)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1))
  if (!blob) throw new Error('页面生成失败')
  return blob
}

export async function exportGraphicPages(
  pages: GraphicTextPage[],
  config: GraphicTextConfig,
  markdown: string,
  onProgress?: (current: number, total: number) => void,
) {
  const fontIds = collectGraphicFontIds(config)
  const sample = pages.flatMap((page) => page.blocks.map((block) => block.text)).join('')
  const sampleByFontId = new Map<string, string>()
  const fonts = []
  for (const fontId of fontIds) {
    const font = getFontById(fontId)
    fonts.push(font)
    sampleByFontId.set(fontId, sample || font.sample)
  }
  // 导出必须等远程字体就绪；失败则抛错，避免静默回退成黑体
  await ensureFontsReadyForExport(fonts, sampleByFontId, {
    fontTimeoutMs: 20000,
    fontsReadyTimeoutMs: 8000,
  })
  // 再确认宋体等关键字体 check 通过
  for (const font of fonts) {
    if (font.source === 'system') continue
    const ok = await ensureFontReady(font, sampleByFontId.get(font.id) || font.sample)
    if (!ok) {
      throw new Error(`字体「${font.label}」未就绪，拒绝导出`)
    }
    const family = font.fontFamily.replace(/"/g, '').split(',')[0].trim()
    const probe = (sampleByFontId.get(font.id) || font.sample).slice(0, 32) || '汉字'
    if (typeof document !== 'undefined' && document.fonts?.check) {
      const checked = document.fonts.check(`400 24px "${family}"`, probe)
        || document.fonts.check(`700 24px "${family}"`, probe)
      if (!checked) {
        throw new Error(`字体「${font.label}」校验失败（${family}），拒绝导出`)
      }
    }
  }

  const blobs: Blob[] = []
  for (let index = 0; index < pages.length; index += 1) {
    blobs.push(await drawPage(pages[index], config, markdown))
    onProgress?.(index + 1, pages.length)
    await new Promise((resolve) => window.setTimeout(resolve, 16))
  }
  return blobs
}

/** 将多页 PNG 纵向拼成一张总览图，便于放大审阅 */
export async function stitchGraphicPagesVertical(
  blobs: Blob[],
  gapPx = 24,
  backgroundColor = '#F5F5F5',
): Promise<Blob> {
  if (!blobs.length) throw new Error('没有可拼接的页面')
  if (blobs.length === 1) return blobs[0]

  const bitmaps = await Promise.all(blobs.map((blob) => createImageBitmap(blob)))
  try {
    const width = Math.max(...bitmaps.map((bitmap) => bitmap.width))
    const height =
      bitmaps.reduce((sum, bitmap) => sum + bitmap.height, 0) + gapPx * (bitmaps.length - 1)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 不可用')

    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)

    let y = 0
    for (const bitmap of bitmaps) {
      const x = Math.round((width - bitmap.width) / 2)
      ctx.drawImage(bitmap, x, y)
      y += bitmap.height + gapPx
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1))
    if (!blob) throw new Error('拼图生成失败')
    return blob
  } finally {
    for (const bitmap of bitmaps) bitmap.close()
  }
}

/** 将多页 PNG 横向拼成一张总览图，便于放大审阅 */
export async function stitchGraphicPagesHorizontal(
  blobs: Blob[],
  gapPx = 24,
  backgroundColor = '#F5F5F5',
): Promise<Blob> {
  if (!blobs.length) throw new Error('没有可拼接的页面')
  if (blobs.length === 1) return blobs[0]

  const bitmaps = await Promise.all(blobs.map((blob) => createImageBitmap(blob)))
  try {
    const height = Math.max(...bitmaps.map((bitmap) => bitmap.height))
    const width =
      bitmaps.reduce((sum, bitmap) => sum + bitmap.width, 0) + gapPx * (bitmaps.length - 1)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 不可用')

    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)

    let x = 0
    for (const bitmap of bitmaps) {
      const y = Math.round((height - bitmap.height) / 2)
      ctx.drawImage(bitmap, x, y)
      x += bitmap.width + gapPx
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1))
    if (!blob) throw new Error('拼图生成失败')
    return blob
  } finally {
    for (const bitmap of bitmaps) bitmap.close()
  }
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
