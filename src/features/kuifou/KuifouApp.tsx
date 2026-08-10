import { Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AddAssetPage } from './AddAssetPage'
import {
  createKuifouAsset,
  createKuifouAssetsBulk,
  deleteKuifouAsset,
  listKuifouAssets,
  reorderKuifouAssets,
  updateKuifouAsset,
} from './api'
import { AssetCard } from './AssetCard'
import { dailyCost, formatYuan, greetingByHour, ownedDays, summarize } from './calc'
import { KUIFOU_CATEGORIES } from './categories'
import { buildSeedAssets } from './seedData'
import type { KuifouAsset, KuifouAssetInput, KuifouFilters, SortKey, SummaryMode } from './types'

type View = 'home' | 'add'

const DEFAULT_FILTERS: KuifouFilters = {
  sort: 'default',
  category: '',
  status: '',
  minPrice: null,
  query: '',
}

function applyFilters(assets: KuifouAsset[], filters: KuifouFilters): KuifouAsset[] {
  let list = [...assets]
  if (filters.query.trim()) {
    const q = filters.query.trim().toLowerCase()
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.category.includes(q) ||
        a.subcategory.includes(q),
    )
  }
  if (filters.category) {
    list = list.filter((a) => a.category === filters.category)
  }
  if (filters.status) {
    list = list.filter((a) => a.status === filters.status)
  }
  if (filters.minPrice != null && filters.minPrice > 0) {
    list = list.filter((a) => a.purchase_price >= filters.minPrice!)
  }
  switch (filters.sort) {
    case 'price_desc':
      list.sort((a, b) => b.purchase_price - a.purchase_price)
      break
    case 'price_asc':
      list.sort((a, b) => a.purchase_price - b.purchase_price)
      break
    case 'days_desc':
      list.sort((a, b) => ownedDays(b.purchase_date) - ownedDays(a.purchase_date))
      break
    case 'cost_desc':
      list.sort((a, b) => dailyCost(b) - dailyCost(a))
      break
    default:
      list.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
  }
  return list
}

export function KuifouApp() {
  const [view, setView] = useState<View>('home')
  const [assets, setAssets] = useState<KuifouAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('assets')
  const [filters, setFilters] = useState<KuifouFilters>(DEFAULT_FILTERS)
  const [searchOpen, setSearchOpen] = useState(false)
  const [reorderId, setReorderId] = useState<string | null>(null)
  const greeting = useMemo(() => greetingByHour(), [])

  const reload = useCallback(async () => {
    setError('')
    const rows = await listKuifouAssets()
    setAssets(rows)
    return rows
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const rows = await listKuifouAssets()
        if (!cancelled) setAssets(rows)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => applyFilters(assets, filters), [assets, filters])
  const stats = useMemo(() => summarize(assets), [assets])
  const hasNotesData = assets.some((a) => a.source_list.startsWith('notes_'))

  const handleSeed = async () => {
    setSeeding(true)
    setError('')
    try {
      const seeds = buildSeedAssets()
      const existingNames = new Set(assets.map((a) => a.name))
      const missing = seeds.filter((s) => !existingNames.has(s.name))
      if (missing.length) {
        const maxOrder = assets.reduce((m, a) => Math.max(m, a.sort_order), 0)
        await createKuifouAssetsBulk(
          missing.map((item, i) => ({ ...item, sort_order: maxOrder + i + 1 })),
        )
      }
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败')
    } finally {
      setSeeding(false)
    }
  }

  const handleSave = async (input: KuifouAssetInput) => {
    setSaving(true)
    try {
      const maxOrder = assets.reduce((m, a) => Math.max(m, a.sort_order), 0)
      await createKuifouAsset({ ...input, sort_order: input.sort_order || maxOrder + 1 })
      await reload()
      setView('home')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const prev = assets
    setAssets((list) => list.filter((a) => a.id !== id))
    try {
      await deleteKuifouAsset(id)
    } catch (e) {
      setAssets(prev)
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  const handleBumpUsage = async (asset: KuifouAsset) => {
    const next = asset.usage_count + 1
    setAssets((list) =>
      list.map((a) => (a.id === asset.id ? { ...a, usage_count: next } : a)),
    )
    try {
      await updateKuifouAsset(asset.id, { usage_count: next })
    } catch (e) {
      setError(e instanceof Error ? e.message : '记次失败')
      await reload()
    }
  }

  const moveReorder = async (targetId: string) => {
    if (!reorderId || reorderId === targetId) return
    const ids = assets.map((a) => a.id)
    const from = ids.indexOf(reorderId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    ids.splice(from, 1)
    ids.splice(to, 0, reorderId)
    const next = ids
      .map((id) => assets.find((a) => a.id === id)!)
      .map((a, i) => ({ ...a, sort_order: i + 1 }))
    setAssets(next)
    setReorderId(null)
    try {
      await reorderKuifouAssets(ids)
    } catch (e) {
      setError(e instanceof Error ? e.message : '排序失败')
      await reload()
    }
  }

  if (view === 'add') {
    return <AddAssetPage onBack={() => setView('home')} onSave={handleSave} saving={saving} />
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-[#EEF2F7] text-slate-900"
      data-testid="kuifou-home"
    >
      <div
        className="shrink-0 px-4"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-blue-500" />
            <span className="text-base font-semibold tracking-wide">亏否</span>
          </div>
          <div
            className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-lg"
            aria-hidden
          >
            🐼
          </div>
        </div>
        <h1 className="text-[22px] font-bold leading-snug tracking-tight">{greeting.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{greeting.subtitle}</p>

        <div className="relative mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-3.5 shadow-sm">
            <div className="text-xs text-slate-400">今日使用成本</div>
            <div className="mt-1 text-xl font-bold tracking-tight" data-testid="kuifou-today-cost">
              {formatYuan(stats.todayCost)}
              <span className="text-sm font-medium text-slate-400">/天</span>
            </div>
          </div>
          <div className="relative rounded-2xl bg-white p-3.5 shadow-sm">
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600"
              onClick={() =>
                setSummaryMode((m) => (m === 'assets' ? 'residual' : 'assets'))
              }
              data-testid="kuifou-summary-switch"
            >
              切换
            </button>
            <div className="text-xs text-slate-400">
              {summaryMode === 'assets' ? '总资产' : '总残值'}
            </div>
            <div className="mt-1 text-xl font-bold tracking-tight" data-testid="kuifou-summary-value">
              {formatYuan(summaryMode === 'assets' ? stats.totalAssets : stats.totalResidual, {
                compact: true,
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col px-4 pb-28">
        <div className="mb-2 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">资产清单</h2>
            <p className="mt-0.5 text-xs text-slate-400">左滑删除 · 长按排序 · 点右侧记次数</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-slate-500"
            onClick={() => setSearchOpen((v) => !v)}
            data-testid="kuifou-search-toggle"
          >
            <Search size={15} />
            搜索
          </button>
        </div>

        {searchOpen ? (
          <input
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="搜索名称 / 类别"
            className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            data-testid="kuifou-search-input"
            autoFocus
          />
        ) : null}

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 text-xs">
          <FilterSelect
            value={filters.sort}
            testId="kuifou-sort"
            onChange={(v) => setFilters((f) => ({ ...f, sort: v as SortKey }))}
            options={[
              { value: 'default', label: '默认排序' },
              { value: 'price_desc', label: '价格从高到低' },
              { value: 'price_asc', label: '价格从低到高' },
              { value: 'days_desc', label: '持有最久' },
              { value: 'cost_desc', label: '日均成本最高' },
            ]}
          />
          <FilterSelect
            value={filters.category}
            testId="kuifou-filter-category"
            onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            options={[
              { value: '', label: '全部类别' },
              ...KUIFOU_CATEGORIES.map((c) => ({ value: c.name, label: c.name })),
            ]}
          />
          <FilterSelect
            value={filters.status}
            testId="kuifou-filter-status"
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            options={[
              { value: '', label: '全部状态' },
              { value: '使用中', label: '使用中' },
              { value: '闲置', label: '闲置' },
              { value: '已出售', label: '已出售' },
              { value: '已赠出', label: '已赠出' },
            ]}
          />
          <FilterSelect
            value={filters.minPrice == null ? '' : String(filters.minPrice)}
            testId="kuifou-filter-price"
            onChange={(v) =>
              setFilters((f) => ({ ...f, minPrice: v ? Number(v) : null }))
            }
            options={[
              { value: '', label: '最低价 —' },
              { value: '1000', label: '¥1,000+' },
              { value: '5000', label: '¥5,000+' },
              { value: '10000', label: '¥10,000+' },
              { value: '30000', label: '¥30,000+' },
            ]}
          />
        </div>

        {!hasNotesData && !loading ? (
          <div
            className="mb-3 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700"
            data-testid="kuifou-seed-banner"
          >
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              导入
            </span>
            <span className="min-w-0 flex-1">备忘录两页奢侈品清单尚未入库</span>
            <button
              type="button"
              className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white"
              disabled={seeding}
              onClick={() => void handleSeed()}
              data-testid="kuifou-seed-btn"
            >
              {seeding ? '导入中' : '导入'}
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>
        ) : null}

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pb-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">加载中…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400" data-testid="kuifou-empty">
              暂无资产，点右下角添加
            </div>
          ) : (
            filtered.map((asset) => (
              <div
                key={asset.id}
                onClick={() => {
                  if (reorderId) void moveReorder(asset.id)
                }}
              >
                <AssetCard
                  asset={asset}
                  dragging={reorderId === asset.id}
                  onDelete={() => void handleDelete(asset.id)}
                  onBumpUsage={() => void handleBumpUsage(asset)}
                  onLongPressStart={() => setReorderId(asset.id)}
                />
              </div>
            ))
          )}
          {!loading && filtered.length > 0 ? (
            <p className="py-2 text-center text-[11px] text-slate-400">
              共 {filtered.length} 件
              {reorderId ? ' · 点击另一条完成排序' : ''}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/40"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="添加资产"
        data-testid="kuifou-fab"
        onClick={() => setView('add')}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  )
}

function FilterSelect({
  value,
  options,
  onChange,
  testId,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  testId: string
}) {
  const label = options.find((o) => o.value === value)?.label ?? options[0]?.label
  return (
    <label className="relative shrink-0">
      <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-slate-600 shadow-sm">
        {label}
        <span className="text-[10px] text-slate-400">▼</span>
      </span>
      <select
        className="absolute inset-0 cursor-pointer opacity-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      >
        {options.map((o) => (
          <option key={o.value || 'all'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
