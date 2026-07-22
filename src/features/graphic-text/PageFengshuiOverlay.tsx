import {
  resolveFengshuiTextureUrl,
  FENGSHUI_CANVAS_COLOR,
  FENGSHUI_IMAGE_OPACITY,
} from './pageFengshuiTokens'

interface PageFengshuiOverlayProps {
  stacked?: boolean
}

/** 预览层：水色底图 + 透明雾色，保留蓝调且不抢标题 */
export function PageFengshuiOverlay({ stacked = false }: PageFengshuiOverlayProps) {
  const textureUrl = resolveFengshuiTextureUrl()

  return (
    <div
      className="graphic-page-overlay pointer-events-none absolute inset-0 z-0 size-full overflow-hidden"
      aria-hidden
    >
      {!stacked && (
        <div className="absolute inset-0" style={{ backgroundColor: FENGSHUI_CANVAS_COLOR }} />
      )}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url("${textureUrl}")`,
          opacity: FENGSHUI_IMAGE_OPACITY,
        }}
      />
      {/* 顶部宣纸雾，给大标题留白（略轻，保留水色） */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(247,244,238,0.55) 0%, rgba(247,244,238,0.18) 38%, rgba(247,244,238,0) 58%)',
        }}
      />
      {/* 中部极淡灰雾 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, rgba(170,176,180,0.07) 0%, rgba(170,176,180,0) 70%)',
        }}
      />
      {/* 底部微暖透明罩 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(196,178,150,0) 55%, rgba(196,178,150,0.08) 100%)',
        }}
      />
    </div>
  )
}
