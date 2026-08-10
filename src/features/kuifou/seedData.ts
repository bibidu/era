import { inferCategory } from './categories'
import type { KuifouAssetInput } from './types'

/** 用户备忘录两页清单：名称 + 价格（已按公式折算） */
const RAW_ITEMS: Array<{ name: string; price: number; source: string; date: string }> = [
  // 页一：Dior / Chanel 为主
  { name: 'Dior 蒙田 30链条包', price: 26500, source: 'notes_page1', date: '2025-11-12' },
  { name: 'Dior 双肩包', price: 18963.56, source: 'notes_page1', date: '2025-10-08' },
  { name: 'Dior 草编帽', price: 5886.78, source: 'notes_page1', date: '2025-08-20' },
  { name: 'Dior 墨镜', price: 3708.67, source: 'notes_page1', date: '2025-09-01' },
  { name: 'Dior 项链', price: 3269.75, source: 'notes_page1', date: '2025-12-15' },
  { name: 'Chanel 22bag 蓝色', price: 36751.3, source: 'notes_page1', date: '2026-01-18' },
  { name: 'Chanel 沙滩包粉色', price: 32553.93, source: 'notes_page1', date: '2025-07-22' },
  { name: 'Chanel 24b 手柄 woc', price: 36500, source: 'notes_page1', date: '2026-02-10' },
  // 48506.05 - (10%-1.55%)*48506.05
  { name: 'Chanel 25bag 小号', price: 44407.29, source: 'notes_page1', date: '2026-03-05' },
  { name: 'Chanel 墨镜 5541-A', price: 4344, source: 'notes_page1', date: '2025-06-30' },
  { name: 'Chanel 耳钉', price: 3747, source: 'notes_page1', date: '2025-06-30' },
  { name: 'Chanel 钱包', price: 7355, source: 'notes_page1', date: '2025-06-30' },

  // 页二：LV / Prada / 其他
  { name: 'LV Carryall 大号 黑三彩', price: 33500, source: 'notes_page2', date: '2025-12-01' },
  { name: 'LV side trunk 小号', price: 27600, source: 'notes_page2', date: '2026-01-08' },
  { name: 'LV ivy 大象灰', price: 15364.52, source: 'notes_page2', date: '2025-09-15' },
  { name: 'LV 羊绒围巾', price: 7500, source: 'notes_page2', date: '2025-11-28' },
  { name: 'MiuMiu Adventure', price: 23315, source: 'notes_page2', date: '2026-02-20' },
  { name: 'Prada softlux 大号', price: 16645, source: 'notes_page2', date: '2025-10-20' },
  { name: 'Prada 草编包', price: 8231.12, source: 'notes_page2', date: '2025-08-05' },
  { name: 'Prada 乐福鞋', price: 6352.88, source: 'notes_page2', date: '2025-09-28' },
  { name: 'Prada 黑色冷帽', price: 3810, source: 'notes_page2', date: '2025-12-22' },
  { name: 'Prada 墨镜', price: 3400, source: 'notes_page2', date: '2025-07-10' },
  { name: 'Ysl niki 黑色中号', price: 17110, source: 'notes_page2', date: '2026-01-25' },
  { name: 'Gucci 马蒙白色 22', price: 15403, source: 'notes_page2', date: '2025-11-05' },
  { name: 'Gucci 马蒙 mini', price: 7445, source: 'notes_page2', date: '2025-08-18' },
  { name: 'Moncler 羽绒服 maire', price: 13702, source: 'notes_page2', date: '2025-12-08' },
  { name: 'Burberry 小战马围巾', price: 6146, source: 'notes_page2', date: '2026-01-02' },
  { name: 'Burberry 大标格子蓝色羊绒围巾', price: 4800, source: 'notes_page2', date: '2025-10-12' },
  { name: 'GM 墨镜半透明', price: 1119.57, source: 'notes_page2', date: '2025-06-15' },
  { name: 'GM 墨镜', price: 2000, source: 'notes_page2', date: '2025-05-20' },
]

export function buildSeedAssets(): KuifouAssetInput[] {
  return RAW_ITEMS.map((item, index) => {
    const inferred = inferCategory(item.name)
    const isBag = inferred.subcategory === '手袋' || inferred.subcategory === '双肩包'
    return {
      name: item.name,
      icon: inferred.icon,
      category: inferred.category,
      subcategory: inferred.subcategory,
      purchase_price: Math.round(item.price * 100) / 100,
      purchase_date: item.date,
      status: '使用中',
      under_warranty: isBag,
      warranty_until: isBag ? '2027-12-31' : null,
      usage_count: 0,
      sort_order: index + 1,
      billing_mode: '日均',
      residual_rate: isBag ? 0.55 : inferred.category === '配饰' ? 0.4 : 0.35,
      notes: '',
      is_demo: false,
      source_list: item.source,
    }
  })
}

export const SEED_ASSET_COUNT = RAW_ITEMS.length
