export interface CategoryNode {
  name: string
  children: string[]
}

export const KUIFOU_CATEGORIES: CategoryNode[] = [
  { name: '箱包', children: ['手袋', '双肩包', '钱包', '旅行箱'] },
  { name: '服饰', children: ['外套', '鞋履', '围巾', '帽子'] },
  { name: '配饰', children: ['墨镜', '珠宝', '手表', '其他'] },
  { name: '数码产品', children: ['手机', '电脑', '耳机', '影像'] },
  { name: '个护美妆', children: ['护肤', '电器', '彩妆'] },
  { name: '其他', children: ['日用', '收藏'] },
]

export const CATEGORY_ICONS: Record<string, string[]> = {
  箱包: ['👜', '🎒', '👝', '🧳', '💼'],
  服饰: ['🧥', '👟', '🧣', '🧢', '👗', '👠'],
  配饰: ['🕶️', '👓', '💍', '⌚', '💎', '✨'],
  数码产品: ['📱', '💻', '🎧', '⌚', '📷', '🖥️', '⌨️', '🖱️'],
  个护美妆: ['💄', '🧴', '💇', '💅'],
  其他: ['📦', '🎁', '🏠', '🧸'],
}

export const EMOJI_PICKER: string[] = [
  '📱', '💻', '⌚', '🎮', '🖥️', '⌨️', '🖱️', '🖨️', '🎧', '📺', '📷', '📹',
  '🔋', '💾', '🚗', '🚕', '🚌', '🚲', '✈️', '🚂', '⛵', '🚁', '🛴', '🚄',
  '🚇', '🚏', '🗺️', '🎫', '🎟️', '🎪', '👜', '🎒', '👝', '💼', '🧳', '🧥',
  '👟', '👠', '🧣', '🧢', '🕶️', '👓', '💍', '💄', '🧴', '✨', '🎁', '📦',
]

export function inferCategory(name: string): { category: string; subcategory: string; icon: string } {
  const n = name.toLowerCase()
  if (/墨镜|眼镜|gm|sunglasses/.test(n)) return { category: '配饰', subcategory: '墨镜', icon: '🕶️' }
  if (/耳钉|项链|珠宝/.test(n)) return { category: '配饰', subcategory: '珠宝', icon: '💍' }
  if (/围巾/.test(n)) return { category: '服饰', subcategory: '围巾', icon: '🧣' }
  if (/冷帽|草编帽|帽/.test(n)) return { category: '服饰', subcategory: '帽子', icon: '🧢' }
  if (/乐福鞋|鞋/.test(n)) return { category: '服饰', subcategory: '鞋履', icon: '👟' }
  if (/羽绒服|外套/.test(n)) return { category: '服饰', subcategory: '外套', icon: '🧥' }
  if (/双肩包|backpack/.test(n)) return { category: '箱包', subcategory: '双肩包', icon: '🎒' }
  if (/钱包|woc|wallet/.test(n)) return { category: '箱包', subcategory: '钱包', icon: '👝' }
  if (
    /包|bag|carryall|trunk|ivy|niki|马蒙|montaigne|softlux|adventure|沙滩/.test(n)
  ) {
    return { category: '箱包', subcategory: '手袋', icon: '👜' }
  }
  if (/iphone|手机/.test(n)) return { category: '数码产品', subcategory: '手机', icon: '📱' }
  if (/macbook|电脑/.test(n)) return { category: '数码产品', subcategory: '电脑', icon: '💻' }
  if (/airpods|耳机/.test(n)) return { category: '数码产品', subcategory: '耳机', icon: '🎧' }
  return { category: '其他', subcategory: '日用', icon: '📦' }
}
