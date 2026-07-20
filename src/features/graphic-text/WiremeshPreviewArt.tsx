import {
  WIREMESH_CANVAS_COLOR,
  WIREMESH_FADE,
  WIREMESH_GEOMETRY,
  lineOpacity,
} from './pageWiremeshTokens'

/** 工具条缩略预览：左上/右下更清晰，其余更淡 */
export function WiremeshPreviewArt() {
  const { points, edges, pixels } = WIREMESH_GEOMETRY
  const previewEdges = edges.filter((edge) => edge.falloff < 1)
  const previewPixels = pixels.slice(0, 22)

  return (
    <svg className="size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
      <defs>
        <radialGradient id="wiremesh-preview-glow-tl" cx="18%" cy="16%" r="45%">
          <stop offset="0%" stopColor={`rgba(167, 243, 208, ${0.28 * WIREMESH_FADE})`} />
          <stop offset="100%" stopColor="rgba(247, 248, 249, 0)" />
        </radialGradient>
        <radialGradient id="wiremesh-preview-glow-br" cx="82%" cy="84%" r="45%">
          <stop offset="0%" stopColor={`rgba(167, 243, 208, ${0.28 * WIREMESH_FADE})`} />
          <stop offset="100%" stopColor="rgba(247, 248, 249, 0)" />
        </radialGradient>
      </defs>
      <rect width="1" height="1" fill={WIREMESH_CANVAS_COLOR} />
      <rect width="1" height="1" fill="url(#wiremesh-preview-glow-tl)" />
      <rect width="1" height="1" fill="url(#wiremesh-preview-glow-br)" />
      {previewEdges.map((edge, index) => {
        const a = points[edge.a]
        const b = points[edge.b]
        const alpha = lineOpacity(edge.falloff, edge.midX, edge.midY)
        return (
          <line
            key={index}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={`rgba(52, 211, 153, ${alpha})`}
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
          fill={`rgba(52, 211, 153, ${lineOpacity(0, pixel.x, pixel.y)})`}
        />
      ))}
    </svg>
  )
}
