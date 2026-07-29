interface MetricMiniChartProps {
  points: { label: string; value: number }[]
  height?: number
  compact?: boolean
}

/** 轻量 SVG 柱状图，无第三方图表依赖 */
export function MetricMiniChart({ points, height = 88, compact = false }: MetricMiniChartProps) {
  if (!points.length) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl text-xs"
        style={{ height, background: 'var(--era-input)', color: 'var(--era-muted)' }}
      >
        暂无图表数据
      </div>
    )
  }

  const maxValue = Math.max(...points.map((point) => Math.abs(point.value)), 1)
  const barMax = height - (compact ? 22 : 28)

  return (
    <div className="w-full rounded-2xl px-2 pb-1 pt-2" style={{ background: 'var(--era-input)', height }}>
      <div className="flex h-full items-end justify-between gap-1">
        {points.map((point) => {
          const ratio = Math.abs(point.value) / maxValue
          const barHeight = Math.max(4, Math.round(ratio * barMax))
          return (
            <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              {!compact ? (
                <span className="max-w-full truncate text-[10px] leading-none" style={{ color: 'var(--era-muted)' }}>
                  {Number.isInteger(point.value) ? point.value : point.value.toFixed(1)}
                </span>
              ) : null}
              <div
                className="w-full max-w-6 rounded-t-md"
                style={{
                  height: barHeight,
                  background: 'var(--era-button)',
                  opacity: 0.85,
                }}
              />
              <span className="max-w-full truncate text-[10px] leading-none" style={{ color: 'var(--era-muted)' }}>
                {point.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
