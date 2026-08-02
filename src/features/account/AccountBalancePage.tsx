import { ChevronLeft, RefreshCw, Wallet } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { LEGACY_SUPABASE_ANON_KEY } from '../../agent/supabaseHighlightSetup'

const BALANCE_ENDPOINT =
  'https://kzoxyextxjwscrpjowud.functions.supabase.co/aliyun-account-balance'

interface BalancePayload {
  availableAmount?: string | null
  availableCashAmount?: string | null
  creditAmount?: string | null
  mybankCreditAmount?: string | null
  currency?: string | null
  quotaLimit?: string | null
  requestId?: string | null
  note?: string | null
  error?: string
  hint?: string | null
  code?: string | null
}

interface AccountBalancePageProps {
  onBack: () => void
}

function formatMoney(value: string | null | undefined, currency: string) {
  if (value == null || value === '') return '—'
  const unit = currency === 'CNY' || !currency ? '¥' : `${currency} `
  return `${unit}${value}`
}

export function AccountBalancePage({ onBack }: AccountBalancePageProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BalancePayload | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(BALANCE_ENDPOINT, {
        method: 'GET',
        headers: {
          apikey: LEGACY_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${LEGACY_SUPABASE_ANON_KEY}`,
        },
      })
      const json = (await res.json()) as BalancePayload
      if (!res.ok) {
        setData(json)
        setError(json.error || `查询失败（HTTP ${res.status}）`)
        return
      }
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const currency = data?.currency || 'CNY'

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}>
      <header
        className="flex shrink-0 items-center gap-2 border-b px-3 py-3"
        style={{ borderColor: 'var(--era-border)' }}
      >
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full"
          style={{ background: 'var(--era-panel)' }}
          aria-label="返回"
          onClick={onBack}
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="min-w-0 flex-1 text-base font-semibold">账户余额</h1>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full disabled:opacity-40"
          style={{ background: 'var(--era-panel)' }}
          aria-label="刷新"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div
          className="rounded-3xl border p-5"
          style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
        >
          <div className="flex items-center gap-2" style={{ color: 'var(--era-muted)' }}>
            <Wallet size={16} />
            <span className="text-xs font-medium tracking-wide">阿里云可用额度</span>
          </div>

          {loading ? (
            <p className="mt-6 text-sm" style={{ color: 'var(--era-muted)' }}>
              查询中…
            </p>
          ) : error ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-amber-200">{error}</p>
              {data?.hint ? (
                <p className="text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
                  {data.hint}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="mt-4 text-4xl font-semibold tracking-tight">
                {formatMoney(data?.availableAmount, currency)}
              </p>
              <p className="mt-2 text-xs" style={{ color: 'var(--era-muted)' }}>
                AvailableAmount · {currency}
              </p>

              <dl className="mt-6 grid gap-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--era-muted)' }}>现金余额</dt>
                  <dd className="font-medium">{formatMoney(data?.availableCashAmount, currency)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--era-muted)' }}>信控额度</dt>
                  <dd className="font-medium">{formatMoney(data?.creditAmount, currency)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--era-muted)' }}>网商信用额度</dt>
                  <dd className="font-medium">{formatMoney(data?.mybankCreditAmount, currency)}</dd>
                </div>
              </dl>
            </>
          )}
        </div>

        <p className="mt-4 px-1 text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
          {data?.note ||
            'Qwen / DashScope 按量费用从阿里云账户余额扣取；DashScope API Key 本身不提供余额查询，此处走费用 OpenAPI。'}
        </p>
        {data?.requestId ? (
          <p className="mt-2 px-1 font-mono text-[10px]" style={{ color: 'var(--era-muted)' }}>
            requestId: {data.requestId}
          </p>
        ) : null}
      </div>
    </div>
  )
}
