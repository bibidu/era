import { FENGSHUI_CANVAS_COLOR, resolveFengshuiTextureUrl } from './pageFengshuiTokens'

/** 工具条缩略预览：淡色水墨村舍 */
export function FengshuiPreviewArt() {
  const textureUrl = resolveFengshuiTextureUrl()

  return (
    <div className="relative size-full overflow-hidden" style={{ backgroundColor: FENGSHUI_CANVAS_COLOR }}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${textureUrl}")`, opacity: 0.62 }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(247,244,238,0.55) 0%, rgba(247,244,238,0.15) 55%, rgba(196,178,150,0.08) 100%)',
        }}
      />
    </div>
  )
}
