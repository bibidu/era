import { eraAuthHeaders } from '../../auth/eraAuth'
import { browserSupabaseConfig } from '../../agent/supabaseHighlightSetup'
import type { KuifouAsset, KuifouAssetInput, KuifouBillingMode, KuifouStatus } from './types'
import { KUIFOU_BILLING_MODES, KUIFOU_STATUSES } from './types'

export const KUIFOU_ASSETS_TABLE = 'kuifou_assets'

/** 同源 /rest/v1（Vite 代理或 Caddy），避免本地开发跨域到 sslip */
function restBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return browserSupabaseConfig().url
}

async function rest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  const config = browserSupabaseConfig()
  const headers = eraAuthHeaders(init.headers)
  headers.set('apikey', config.anonKey)
  headers.set('Authorization', `Bearer ${config.anonKey}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (init.prefer) headers.set('Prefer', init.prefer)

  const res = await fetch(`${restBaseUrl()}/rest/v1/${path}`, {
    ...init,
    headers,
    credentials: 'same-origin',
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`kuifou REST ${res.status}: ${text.slice(0, 400)}`)
  }
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

function normalizeStatus(value: unknown): KuifouStatus {
  if (typeof value === 'string' && (KUIFOU_STATUSES as readonly string[]).includes(value)) {
    return value as KuifouStatus
  }
  return '使用中'
}

function normalizeBilling(value: unknown): KuifouBillingMode {
  if (typeof value === 'string' && (KUIFOU_BILLING_MODES as readonly string[]).includes(value)) {
    return value as KuifouBillingMode
  }
  return '日均'
}

export function normalizeAsset(row: Record<string, unknown>): KuifouAsset {
  return {
    id: String(row.id),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    name: String(row.name ?? ''),
    icon: String(row.icon ?? '📦'),
    category: String(row.category ?? '其他'),
    subcategory: String(row.subcategory ?? ''),
    purchase_price: Number(row.purchase_price) || 0,
    purchase_date: String(row.purchase_date ?? '').slice(0, 10),
    status: normalizeStatus(row.status),
    under_warranty: Boolean(row.under_warranty),
    warranty_until: row.warranty_until ? String(row.warranty_until).slice(0, 10) : null,
    usage_count: Number(row.usage_count) || 0,
    sort_order: Number(row.sort_order) || 0,
    billing_mode: normalizeBilling(row.billing_mode),
    residual_rate: Number(row.residual_rate) || 0.35,
    notes: String(row.notes ?? ''),
    is_demo: Boolean(row.is_demo),
    source_list: String(row.source_list ?? 'user'),
  }
}

export async function listKuifouAssets(): Promise<KuifouAsset[]> {
  const rows = await rest<Record<string, unknown>[]>(
    `${KUIFOU_ASSETS_TABLE}?select=*&order=sort_order.asc,created_at.desc`,
    { method: 'GET' },
  )
  return (rows || []).map(normalizeAsset)
}

export async function createKuifouAsset(input: KuifouAssetInput): Promise<KuifouAsset> {
  const payload = {
    name: input.name,
    icon: input.icon,
    category: input.category,
    subcategory: input.subcategory,
    purchase_price: input.purchase_price,
    purchase_date: input.purchase_date,
    status: input.status,
    under_warranty: input.under_warranty,
    warranty_until: input.warranty_until,
    usage_count: input.usage_count,
    sort_order: input.sort_order,
    billing_mode: input.billing_mode,
    residual_rate: input.residual_rate,
    notes: input.notes,
    is_demo: input.is_demo,
    source_list: input.source_list,
  }
  const rows = await rest<Record<string, unknown>[]>(KUIFOU_ASSETS_TABLE, {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify(payload),
  })
  return normalizeAsset(rows[0])
}

export async function createKuifouAssetsBulk(inputs: KuifouAssetInput[]): Promise<KuifouAsset[]> {
  if (!inputs.length) return []
  const payload = inputs.map((input) => ({
    name: input.name,
    icon: input.icon,
    category: input.category,
    subcategory: input.subcategory,
    purchase_price: input.purchase_price,
    purchase_date: input.purchase_date,
    status: input.status,
    under_warranty: input.under_warranty,
    warranty_until: input.warranty_until,
    usage_count: input.usage_count,
    sort_order: input.sort_order,
    billing_mode: input.billing_mode,
    residual_rate: input.residual_rate,
    notes: input.notes,
    is_demo: input.is_demo,
    source_list: input.source_list,
  }))
  const rows = await rest<Record<string, unknown>[]>(KUIFOU_ASSETS_TABLE, {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify(payload),
  })
  return (rows || []).map(normalizeAsset)
}

export async function updateKuifouAsset(
  id: string,
  patch: Partial<KuifouAssetInput>,
): Promise<KuifouAsset> {
  const rows = await rest<Record<string, unknown>[]>(
    `${KUIFOU_ASSETS_TABLE}?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify(patch),
    },
  )
  return normalizeAsset(rows[0])
}

export async function deleteKuifouAsset(id: string): Promise<void> {
  await rest(`${KUIFOU_ASSETS_TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function reorderKuifouAssets(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, index) =>
      rest(`${KUIFOU_ASSETS_TABLE}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ sort_order: index + 1 }),
      }),
    ),
  )
}
