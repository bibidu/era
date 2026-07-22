import { FENGSHUI_CANVAS_COLOR, FENGSHUI_IMAGE_OPACITY, resolveFengshuiTextureUrl } from './pageFengshuiTokens'

/** 工具条缩略预览：偏蓝水色村舍 */
export function FengshuiPreviewArt() {
  const textureUrl = resolveFengshuiTextureUrl()

  return (
    <div className="relative size-full overflow-hidden" style={{ backgroundColor: FENGSHUI_CANVAS_COLOR }}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${textureUrl}")`, opacity: FENGSHUI_IMAGE_OPACITY }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(240,245,248,0.5) 0%, rgba(240,245,248,0.14) 55%, rgba(180,205,220,0.06) 100%)',
        }}
      />
    </div>
  )
}
