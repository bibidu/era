#!/usr/bin/env node
/** 亏否计算与种子数据 smoke（不依赖浏览器） */
import assert from 'node:assert/strict'
import { dailyCost, formatYuan, ownedDays, residualValue, summarize } from '../src/features/kuifou/calc.ts'
import { buildSeedAssets, SEED_ASSET_COUNT } from '../src/features/kuifou/seedData.ts'
import { inferCategory } from '../src/features/kuifou/categories.ts'

const seeds = buildSeedAssets()
assert.equal(seeds.length, SEED_ASSET_COUNT)
assert.ok(SEED_ASSET_COUNT >= 30, '两页备忘录应不少于 30 条')

const names = new Set(seeds.map((s) => s.name))
assert.equal(names.size, seeds.length, '种子名称不得重复')
assert.ok(names.has('Chanel 25bag 小号'))
assert.ok(names.has('LV Carryall 大号 黑三彩'))
assert.ok(names.has('Dior 蒙田 30链条包'))

const chanel25 = seeds.find((s) => s.name === 'Chanel 25bag 小号')
assert.ok(Math.abs(chanel25.purchase_price - 44407.29) < 0.02)

const bag = inferCategory('Chanel 22bag 蓝色')
assert.equal(bag.category, '箱包')
assert.equal(bag.subcategory, '手袋')

const glasses = inferCategory('GM 墨镜半透明')
assert.equal(glasses.category, '配饰')
assert.equal(glasses.subcategory, '墨镜')

const asset = {
  id: 'x',
  created_at: '',
  updated_at: '',
  name: '测试',
  icon: '📦',
  category: '其他',
  subcategory: '',
  purchase_price: 1000,
  purchase_date: '2026-08-10',
  status: '使用中',
  under_warranty: false,
  warranty_until: null,
  usage_count: 0,
  sort_order: 1,
  billing_mode: '日均',
  residual_rate: 0.5,
  notes: '',
  is_demo: false,
  source_list: 'test',
}

assert.equal(ownedDays('2026-08-10', new Date('2026-08-10T12:00:00')), 1)
assert.equal(ownedDays('2026-08-01', new Date('2026-08-10T12:00:00')), 10)
assert.ok(Math.abs(dailyCost(asset, new Date('2026-08-10T12:00:00')) - 1000) < 0.001)
assert.equal(residualValue(asset), 500)
assert.equal(formatYuan(29600, { compact: true }), '¥2.96万')

const perUse = { ...asset, billing_mode: '按次', usage_count: 4 }
assert.ok(Math.abs(dailyCost(perUse) - 250) < 0.001)

const stats = summarize(seeds.map((s, i) => ({
  ...s,
  id: String(i),
  created_at: '',
  updated_at: '',
})))
assert.ok(stats.totalAssets > 400000)
assert.ok(stats.todayCost > 0)
assert.equal(stats.count, SEED_ASSET_COUNT)

console.log('kuifou-calc-smoke ok', {
  seedCount: SEED_ASSET_COUNT,
  totalAssets: Math.round(stats.totalAssets),
  todayCost: Math.round(stats.todayCost * 100) / 100,
})
