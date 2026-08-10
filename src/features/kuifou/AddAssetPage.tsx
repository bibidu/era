import { ChevronDown, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { KUIFOU_CATEGORIES } from './categories'
import { IconPickerModal } from './IconPickerModal'
import type { KuifouAssetInput, KuifouBillingMode, KuifouStatus } from './types'
import { KUIFOU_STATUSES } from './types'

function todayIso() {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function AddAssetPage({
  onBack,
  onSave,
  saving,
}: {
  onBack: () => void
  onSave: (input: KuifouAssetInput) => Promise<void>
  saving: boolean
}) {
  const [icon, setIcon] = useState('📦')
  const [name, setName] = useState('')
  const [category, setCategory] = useState(KUIFOU_CATEGORIES[0].name)
  const [subcategory, setSubcategory] = useState(KUIFOU_CATEGORIES[0].children[0])
  const [price, setPrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(todayIso())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [status, setStatus] = useState<KuifouStatus>('使用中')
  const [billingMode, setBillingMode] = useState<KuifouBillingMode>('日均')
  const [underWarranty, setUnderWarranty] = useState(false)
  const [warrantyUntil, setWarrantyUntil] = useState('')
  const [residualRate, setResidualRate] = useState('35')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const subs = useMemo(
    () => KUIFOU_CATEGORIES.find((c) => c.name === category)?.children ?? ['其他'],
    [category],
  )

  const canSave = name.trim() && price.trim() && Number(price) > 0 && purchaseDate

  const handleSave = async () => {
    setError('')
    if (!canSave) {
      setError('请填写名称、价格和购买时间')
      return
    }
    const rate = Math.min(100, Math.max(0, Number(residualRate) || 35)) / 100
    try {
      await onSave({
        name: name.trim(),
        icon,
        category,
        subcategory,
        purchase_price: Math.round(Number(price) * 100) / 100,
        purchase_date: purchaseDate,
        status,
        under_warranty: underWarranty,
        warranty_until: underWarranty && warrantyUntil ? warrantyUntil : null,
        usage_count: 0,
        sort_order: 0,
        billing_mode: billingMode,
        residual_rate: rate,
        notes: notes.trim(),
        is_demo: false,
        source_list: 'user',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#EEF2F7]" data-testid="kuifou-add-page">
      <header
        className="flex shrink-0 items-center gap-2 border-b border-slate-200/80 bg-[#EEF2F7] px-3"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem' }}
      >
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm"
          aria-label="返回"
          onClick={onBack}
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-slate-900">添加资产</h1>
        <div className="size-9" />
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-28 pt-3">
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <button
              type="button"
              className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-3xl"
              aria-label="更换图标"
              onClick={() => setPickerOpen(true)}
            >
              {icon}
              <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-slate-800 text-white">
                <Pencil size={12} />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <label className="text-sm font-medium text-slate-700">
                物品名称 <span className="text-rose-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入物品名称"
                className="mt-1 w-full border-0 border-b border-slate-200 bg-transparent py-2 text-base outline-none focus:border-blue-500"
                data-testid="kuifou-name-input"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">点左侧可更换图标，下方完善基础信息</p>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
              01
            </span>
            <h2 className="text-sm font-semibold text-slate-900">基础信息</h2>
          </div>

          <label className="block border-b border-slate-100 py-3">
            <div className="mb-1 text-sm text-slate-600">
              分类 <span className="text-rose-500">*</span>
            </div>
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => {
                  const next = e.target.value
                  setCategory(next)
                  const first =
                    KUIFOU_CATEGORIES.find((c) => c.name === next)?.children[0] ?? '其他'
                  setSubcategory(first)
                }}
                className="flex-1 rounded-xl bg-slate-50 px-3 py-2 text-sm outline-none"
                data-testid="kuifou-category"
              >
                {KUIFOU_CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="flex-1 rounded-xl bg-slate-50 px-3 py-2 text-sm outline-none"
              >
                {subs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronRight className="mt-2 size-4 shrink-0 text-slate-300" />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {category} &gt; {subcategory}
            </p>
          </label>

          <label className="block border-b border-slate-100 py-3">
            <div className="mb-1 text-sm text-slate-600">
              购买价格 <span className="text-rose-500">*</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500">¥</span>
              <input
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="请输入价格"
                className="w-full bg-transparent py-1 text-base outline-none"
                data-testid="kuifou-price-input"
              />
            </div>
          </label>

          <label className="block py-3">
            <div className="mb-1 text-sm text-slate-600">
              购买时间 <span className="text-rose-500">*</span>
            </div>
            <div className="flex items-center justify-between">
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="bg-transparent text-base outline-none"
                data-testid="kuifou-date-input"
              />
              <ChevronDown size={16} className="text-slate-300" />
            </div>
          </label>
        </section>

        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm"
          onClick={() => setAdvancedOpen((v) => !v)}
          data-testid="kuifou-advanced-toggle"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-600">
            更多
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">展开高级设置</span>
            <span className="block text-xs text-slate-400">计费、保修、折旧、备注</span>
          </span>
          <ChevronDown
            size={16}
            className="text-slate-400 transition"
            style={{ transform: advancedOpen ? 'rotate(180deg)' : undefined }}
          />
        </button>

        {advancedOpen ? (
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm" data-testid="kuifou-advanced">
            <label className="block text-sm">
              <span className="text-slate-600">状态</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as KuifouStatus)}
                className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2"
              >
                {KUIFOU_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">计费方式</span>
              <select
                value={billingMode}
                onChange={(e) => setBillingMode(e.target.value as KuifouBillingMode)}
                className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2"
              >
                <option value="日均">日均成本</option>
                <option value="按次">按次成本</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              <span className="text-slate-600">在保</span>
              <input
                type="checkbox"
                checked={underWarranty}
                onChange={(e) => setUnderWarranty(e.target.checked)}
              />
            </label>
            {underWarranty ? (
              <label className="block text-sm">
                <span className="text-slate-600">保修到期</span>
                <input
                  type="date"
                  value={warrantyUntil}
                  onChange={(e) => setWarrantyUntil(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2"
                />
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="text-slate-600">残值比例 %</span>
              <input
                inputMode="decimal"
                value={residualRate}
                onChange={(e) => setResidualRate(e.target.value.replace(/[^\d.]/g, ''))}
                className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">备注</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2"
                placeholder="可选"
              />
            </label>
          </section>
        ) : null}

        {error ? <p className="text-center text-sm text-rose-500">{error}</p> : null}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-lg items-center gap-3 border-t border-slate-200 bg-white/95 px-4 backdrop-blur"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))', paddingTop: '0.75rem' }}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">
            {name.trim() || '未命名'}
          </div>
          <div className="text-xs text-slate-400">完善后点击保存</div>
        </div>
        <button
          type="button"
          disabled={saving || !canSave}
          onClick={() => void handleSave()}
          className="rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 disabled:opacity-40"
          data-testid="kuifou-save-btn"
        >
          {saving ? '保存中…' : '保存物品'}
        </button>
      </div>

      <IconPickerModal
        open={pickerOpen}
        value={icon}
        onClose={() => setPickerOpen(false)}
        onSelect={setIcon}
      />
    </div>
  )
}
