export const KUIFOU_STATUSES = ['使用中', '闲置', '已出售', '已赠出'] as const
export type KuifouStatus = (typeof KUIFOU_STATUSES)[number]

export const KUIFOU_BILLING_MODES = ['日均', '按次'] as const
export type KuifouBillingMode = (typeof KUIFOU_BILLING_MODES)[number]

export interface KuifouAsset {
  id: string
  created_at: string
  updated_at: string
  name: string
  icon: string
  category: string
  subcategory: string
  purchase_price: number
  purchase_date: string
  status: KuifouStatus
  under_warranty: boolean
  warranty_until: string | null
  usage_count: number
  sort_order: number
  billing_mode: KuifouBillingMode
  residual_rate: number
  notes: string
  is_demo: boolean
  source_list: string
}

export type KuifouAssetInput = Omit<
  KuifouAsset,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string
}

export type SortKey = 'default' | 'price_desc' | 'price_asc' | 'days_desc' | 'cost_desc'
export type SummaryMode = 'assets' | 'residual'

export interface KuifouFilters {
  sort: SortKey
  category: string
  status: string
  minPrice: number | null
  query: string
}
