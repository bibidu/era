import { useRef, useState } from 'react'
import { dailyCost, formatDaily, formatYuan, ownedDays } from './calc'
import type { KuifouAsset } from './types'

const DELETE_WIDTH = 88

export function AssetCard({
  asset,
  onDelete,
  onBumpUsage,
  onLongPressStart,
  dragging,
}: {
  asset: KuifouAsset
  onDelete: () => void
  onBumpUsage: () => void
  onLongPressStart?: () => void
  dragging?: boolean
}) {
  const [offset, setOffset] = useState(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const draggingSwipe = useRef(false)
  const longTimer = useRef<number | null>(null)
  const cost = dailyCost(asset)
  const days = ownedDays(asset.purchase_date)

  const clearLong = () => {
    if (longTimer.current != null) {
      window.clearTimeout(longTimer.current)
      longTimer.current = null
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      data-testid={`kuifou-asset-${asset.id}`}
      style={{ opacity: dragging ? 0.7 : 1 }}
    >
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-rose-500 text-sm font-semibold text-white"
        aria-label={`删除 ${asset.name}`}
        data-testid={`kuifou-delete-${asset.id}`}
        onClick={onDelete}
      >
        删除
      </button>

      <article
        className="relative flex gap-3 rounded-2xl bg-white p-3 shadow-sm"
        style={{
          transform: `translateX(${offset}px)`,
          transition: draggingSwipe.current ? 'none' : 'transform 180ms ease',
          touchAction: 'pan-y',
        }}
        onPointerDown={(e) => {
          startX.current = e.clientX
          startY.current = e.clientY
          draggingSwipe.current = false
          clearLong()
          longTimer.current = window.setTimeout(() => {
            onLongPressStart?.()
          }, 420)
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const dx = e.clientX - startX.current
          const dy = e.clientY - startY.current
          if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearLong()
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
            draggingSwipe.current = true
            setOffset(Math.max(-DELETE_WIDTH, Math.min(0, dx)))
          }
        }}
        onPointerUp={() => {
          clearLong()
          setOffset((v) => (v < -DELETE_WIDTH / 2 ? -DELETE_WIDTH : 0))
          draggingSwipe.current = false
        }}
        onPointerCancel={() => {
          clearLong()
          setOffset(0)
          draggingSwipe.current = false
        }}
      >
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-3xl">
          {asset.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-slate-900">{asset.name}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {asset.category}
            {asset.subcategory ? ` · ${asset.subcategory}` : ''} · {days}天
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600">
              {asset.status}
            </span>
            {asset.under_warranty ? (
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600">
                在保
              </span>
            ) : null}
            <span className="text-sm font-medium text-slate-700">
              {formatYuan(asset.purchase_price)}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="flex shrink-0 flex-col items-end justify-center rounded-xl px-1 py-1 text-right active:bg-slate-50"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onBumpUsage()
          }}
          data-testid={`kuifou-usage-${asset.id}`}
          title="点击记次数"
        >
          <span className="text-[11px] text-slate-400">日均成本</span>
          <span className="text-sm font-semibold text-slate-900">{formatDaily(cost)}</span>
          {asset.usage_count > 0 ? (
            <span className="mt-0.5 text-[10px] text-blue-500">已用 {asset.usage_count} 次</span>
          ) : null}
        </button>
      </article>
    </div>
  )
}
