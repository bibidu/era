import {
  WIREMESH_CANVAS_COLOR,
  WIREMESH_FADE,
  WIREMESH_FOCUS_X,
  WIREMESH_FOCUS_Y,
  WIREMESH_GEOMETRY,
  lineOpacity,
} from './pageWiremeshTokens'

/** 工具条缩略预览：约 75% 覆盖，上淡下深 */
export function WiremeshPreviewArt() {
  const { points, edges, pixels } = WIREMESH_GEOMETRY
  const previewEdges = edges.filter((edge) => edge.falloff < 1)
  const previewPixels = pixels.slice(0, 22)

  return (
    <svg className="size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
      <defs>
        <radialGradient
          id="wiremesh-preview-glow"
          cx={`${WIREMESH_FOCUS_X * 100}%`}
          cy={`${WIREMESH_FOCUS_Y * 100}%`}
          r="60%"
        >
          <stop offset="0%" stopColor={`rgba(167, 243, 208, ${0.38 * WIREMESH_FADE})`} />
          <stop offset="100%" stopColor="rgba(247, 248, 249, 0)" />
        </radialGradient>
        <linearGradient id="wiremesh-preview-wash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgba(167, 243, 208, ${0.05 * WIREMESH_FADE})`} />
          <stop offset="100%" stopColor={`rgba(52, 211, 153, ${0.12 * WIREMESH_FADE})`} />
        </linearGradient>
      </defs>
      <rect width="1" height="1" fill={WIREMESH_CANVAS_COLOR} />
      <rect width="1" height="1" fill="url(#wiremesh-preview-glow)" />
      <rect width="1" height="1" fill="url(#wiremesh-preview-wash)" />
      {previewEdges.map((edge, index) => {
        const a = points[edge.a]
        const b = points[edge.b]
        const alpha = lineOpacity(edge.falloff, edge.midY)
        return (
          <line
            key={index}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={`rgba(52, 211, 153, ${Math.min(0.55, alpha * 0.95 + 0.04)})`}
            strokeWidth={0.009}
            strokeLinecap="round"
          />
        )
      })}
      {previewPixels.map((pixel, index) => (
        <rect
          key={`p-${index}`}
          x={pixel.x - pixel.size}
          y={pixel.y - pixel.size}
          width={pixel.size * 2}
          height={pixel.size * 2}
          fill={pixel.soft ? `rgba(110, 231, 183, ${0.7 * WIREMESH_FADE})` : `rgba(52, 211, 153, ${0.85 * WIREMESH_FADE})`}
          opacity={0.35 + pixel.y * 0.55}
        />
      ))}
    </svg>
  )
}
