import {
  resolveFengshuiTextureUrl,
  FENGSHUI_CANVAS_COLOR,
  FENGSHUI_IMAGE_OPACITY,
} from './pageFengshuiTokens'

interface PageFengshuiOverlayProps {
  stacked?: boolean
}

/** 预览层：偏蓝水色底图 + 冷调雾罩，与导出参数一致 */
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
      {/* 顶部冷调雾，给大标题留白 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(240,245,248,0.5) 0%, rgba(240,245,248,0.16) 38%, rgba(240,245,248,0) 58%)',
        }}
      />
      {/* 中部极淡青灰雾 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, rgba(170,190,205,0.08) 0%, rgba(170,190,205,0) 70%)',
        }}
      />
      {/* 底部微弱冷青罩 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(180,205,220,0) 55%, rgba(180,205,220,0.06) 100%)',
        }}
      />
    </div>
  )
}
