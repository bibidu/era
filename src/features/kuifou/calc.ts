import type { KuifouAsset } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

export function ownedDays(purchaseDate: string, now = new Date()): number {
  const bought = new Date(`${purchaseDate}T00:00:00`)
  if (Number.isNaN(bought.getTime())) return 1
  const diff = Math.floor((startOfDay(now).getTime() - bought.getTime()) / DAY_MS)
  return Math.max(1, diff + 1)
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** 日均成本：按次计费用 总价/次数；否则 总价/持有天数 */
export function dailyCost(asset: KuifouAsset, now = new Date()): number {
  const price = Number(asset.purchase_price) || 0
  if (price <= 0) return 0
  if (asset.billing_mode === '按次') {
    const count = Math.max(1, Number(asset.usage_count) || 0)
    return price / count
  }
  return price / ownedDays(asset.purchase_date, now)
}

export function residualValue(asset: KuifouAsset): number {
  const price = Number(asset.purchase_price) || 0
  const rate = Number(asset.residual_rate)
  const safeRate = Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 0.35
  if (asset.status === '已出售' || asset.status === '已赠出') return 0
  return price * safeRate
}

export function formatYuan(value: number, opts: { compact?: boolean; digits?: number } = {}): string {
  const n = Number(value) || 0
  if (opts.compact && Math.abs(n) >= 10000) {
    return `¥${(n / 10000).toFixed(2)}万`
  }
  const digits = opts.digits ?? 2
  return `¥${n.toFixed(digits)}`
}

export function formatDaily(value: number): string {
  if (!Number.isFinite(value)) return '¥0.00/天'
  if (value >= 1000) return `${formatYuan(value, { digits: 2 })}/天`
  return `¥${value.toFixed(2)}/天`
}

export function greetingByHour(hour = new Date().getHours()): { title: string; subtitle: string } {
  if (hour < 6) {
    return { title: '夜色来了，账本也亮着', subtitle: '少一点吃灰，多一点使用' }
  }
  if (hour < 11) {
    return { title: '早上好，先盘一盘资产', subtitle: '用得明白，买得才踏实' }
  }
  if (hour < 14) {
    return { title: '中午好，看看今日成本', subtitle: '让每一件都在发光' }
  }
  if (hour < 18) {
    return { title: '下午好，清单比购物车热闹', subtitle: '少囤货，多复用' }
  }
  return { title: '夜里好，给购物车降降温', subtitle: '夜深前，让资产清单比购物车热闹' }
}

export function summarize(assets: KuifouAsset[], now = new Date()) {
  const active = assets.filter((a) => a.status === '使用中' || a.status === '闲置')
  const todayCost = active.reduce((sum, a) => sum + dailyCost(a, now), 0)
  const totalAssets = assets
    .filter((a) => a.status !== '已出售' && a.status !== '已赠出')
    .reduce((sum, a) => sum + (Number(a.purchase_price) || 0), 0)
  const totalResidual = assets.reduce((sum, a) => sum + residualValue(a), 0)
  return { todayCost, totalAssets, totalResidual, count: assets.length }
}
