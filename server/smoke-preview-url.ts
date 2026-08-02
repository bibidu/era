/**
 * EdgeOne / 应用预览 URL 规范化与参数合并 smoke
 * 覆盖：二次编码 query、带 eo_token 基址合并、禁止污染 eo_time
 */
import assert from 'node:assert/strict'
import {
  buildAppPagesUrl,
  highlightSetupPagesUrl,
  normalizePreviewUrl,
  titleComposerPagesUrl,
} from '../src/agent/supabaseHighlightSetup.ts'

const edgeBase =
  'https://bibidu-era-0tdhv043.edgeone.cool/?eo_token=37d84b1f9d92753698735ac65e7e4f51&eo_time=1785661112'

const doubleEncoded =
  'https://bibidu-era-0tdhv043.edgeone.cool/?eo_token%3D37d84b1f9d92753698735ac65e7e4f51%26eo_time%3D1785661112%26tab%3Dhighlight%26shareId%3D1dac7255-16f2-413f-a84d-df3c2cadb87d'

const fixed = normalizePreviewUrl(doubleEncoded)
const fixedUrl = new URL(fixed)
assert.equal(fixedUrl.searchParams.get('eo_token'), '37d84b1f9d92753698735ac65e7e4f51')
assert.equal(fixedUrl.searchParams.get('eo_time'), '1785661112')
assert.equal(fixedUrl.searchParams.get('tab'), 'highlight')
assert.equal(fixedUrl.searchParams.get('shareId'), '1dac7255-16f2-413f-a84d-df3c2cadb87d')
assert.ok(!fixed.includes('%3D'), 'normalize 后不应残留整段 query 二次编码')

const merged = highlightSetupPagesUrl('1dac7255-16f2-413f-a84d-df3c2cadb87d', edgeBase)
const mergedUrl = new URL(merged)
assert.equal(mergedUrl.searchParams.get('eo_token'), '37d84b1f9d92753698735ac65e7e4f51')
assert.equal(mergedUrl.searchParams.get('eo_time'), '1785661112')
assert.equal(mergedUrl.searchParams.get('tab'), 'highlight')
assert.equal(mergedUrl.searchParams.get('shareId'), '1dac7255-16f2-413f-a84d-df3c2cadb87d')
assert.notEqual(mergedUrl.searchParams.get('eo_time'), '1785661112/')

const titleUrl = new URL(titleComposerPagesUrl('厨房别放西北角', edgeBase))
assert.equal(titleUrl.searchParams.get('tab'), 'title')
assert.equal(titleUrl.searchParams.get('text'), '厨房别放西北角')
assert.equal(titleUrl.searchParams.get('eo_token'), '37d84b1f9d92753698735ac65e7e4f51')

const fromBrokenBase = buildAppPagesUrl(doubleEncoded, { tab: 'data' })
const fromBroken = new URL(fromBrokenBase)
assert.equal(fromBroken.searchParams.get('eo_token'), '37d84b1f9d92753698735ac65e7e4f51')
assert.equal(fromBroken.searchParams.get('tab'), 'data')
assert.equal(fromBroken.searchParams.get('shareId'), '1dac7255-16f2-413f-a84d-df3c2cadb87d')

const bare = new URL(highlightSetupPagesUrl('abc-share'))
assert.equal(bare.searchParams.get('tab'), 'highlight')
assert.equal(bare.searchParams.get('shareId'), 'abc-share')

console.log('preview url normalize/merge ok')
