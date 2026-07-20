import {
  WIREMESH_CANVAS_COLOR,
  WIREMESH_FOCUS_X,
  WIREMESH_FOCUS_Y,
  WIREMESH_GEOMETRY,
} from './pageWiremeshTokens'

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

/** 工具条缩略预览：偏下半屏薄荷绿线网 + 浅灰纸底 */
export function WiremeshPreviewArt() {
  const { points, edges, pixels } = WIREMESH_GEOMETRY
  const previewEdges = edges.filter((edge) => edge.falloff < 1)
  const previewPixels = pixels.filter((pixel) => pixel.y > 0.45)

  return (
    <svg className="size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
      <defs>
        <radialGradient
          id="wiremesh-preview-glow"
          cx={`${WIREMESH_FOCUS_X * 100}%`}
          cy={`${WIREMESH_FOCUS_Y * 100}%`}
          r="55%"
        >
          <stop offset="0%" stopColor="rgba(167, 243, 208, 0.42)" />
          <stop offset="100%" stopColor="rgba(238, 240, 242, 0)" />
        </radialGradient>
      </defs>
      <rect width="1" height="1" fill={WIREMESH_CANVAS_COLOR} />
      <rect width="1" height="1" fill="url(#wiremesh-preview-glow)" />
      {previewEdges.map((edge, index) => {
        const a = points[edge.a]
        const b = points[edge.b]
        const alpha = clamp01(1 - edge.falloff * 0.9)
        return (
          <line
            key={index}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={`rgba(52, 211, 153, ${0.25 + alpha * 0.45})`}
            strokeWidth={0.01}
            strokeLinecap="round"
          />
        )
      })}
      {previewPixels.slice(0, 18).map((pixel, index) => (
        <rect
          key={`p-${index}`}
          x={pixel.x - pixel.size}
          y={pixel.y - pixel.size}
          width={pixel.size * 2}
          height={pixel.size * 2}
          fill={pixel.soft ? 'rgba(110, 231, 183, 0.75)' : '#34D399'}
        />
      ))}
    </svg>
  )
}
