/**
 * 应用预览 URL 规范化与参数合并 smoke
 * 覆盖：二次编码 query 还原、基址合并 tab/shareId/text
 */
import assert from 'node:assert/strict'
import {
  buildAppPagesUrl,
  highlightSetupPagesUrl,
  normalizePreviewUrl,
  parsePreviewSearchParams,
  titleComposerPagesUrl,
} from '../src/agent/supabaseHighlightSetup.ts'
import { readAppTabFromSearch, readSocialPostIdFromSearch } from '../src/app/tabRouting.ts'

const selfBase = 'http://39.106.179.17/'

const doubleEncoded =
  'http://39.106.179.17/?tab%3Ddata%26post%3D1dac7255-16f2-413f-a84d-df3c2cadb87d'

const fixed = normalizePreviewUrl(doubleEncoded)
const fixedUrl = new URL(fixed)
assert.equal(fixedUrl.searchParams.get('tab'), 'data')
assert.equal(fixedUrl.searchParams.get('post'), '1dac7255-16f2-413f-a84d-df3c2cadb87d')
assert.ok(!fixed.includes('%3D'), 'normalize 后不应残留整段 query 二次编码')

const merged = highlightSetupPagesUrl('1dac7255-16f2-413f-a84d-df3c2cadb87d', selfBase)
const mergedUrl = new URL(merged)
assert.equal(mergedUrl.origin, 'http://39.106.179.17')
assert.equal(mergedUrl.searchParams.get('tab'), 'highlight')
assert.equal(mergedUrl.searchParams.get('shareId'), '1dac7255-16f2-413f-a84d-df3c2cadb87d')

const titleUrl = new URL(titleComposerPagesUrl('厨房别放西北角', selfBase))
assert.equal(titleUrl.searchParams.get('tab'), 'title')
assert.equal(titleUrl.searchParams.get('text'), '厨房别放西北角')

const fromBrokenBase = buildAppPagesUrl(doubleEncoded, { tab: 'data' })
const fromBroken = new URL(fromBrokenBase)
assert.equal(fromBroken.searchParams.get('tab'), 'data')
assert.equal(fromBroken.searchParams.get('post'), '1dac7255-16f2-413f-a84d-df3c2cadb87d')

const bare = new URL(highlightSetupPagesUrl('abc-share'))
assert.equal(bare.origin, 'https://39.106.179.17.sslip.io')
assert.equal(bare.searchParams.get('tab'), 'highlight')
assert.equal(bare.searchParams.get('shareId'), 'abc-share')

// 前端深链：二次编码时不得落回丢 post；未知 tab 回落社媒
const mangledSearch = '?tab%3Ddata%26post%3D1dac7255-16f2-413f-a84d-df3c2cadb87d'
assert.equal(readAppTabFromSearch(mangledSearch), 'data')
assert.equal(readSocialPostIdFromSearch(mangledSearch), '1dac7255-16f2-413f-a84d-df3c2cadb87d')
assert.equal(readAppTabFromSearch('?tab=highlight&shareId=abc'), 'data')
assert.equal(readAppTabFromSearch('?tab=title&text=x'), 'data')
assert.equal(readAppTabFromSearch('?tab=stitch'), 'data')
assert.equal(readAppTabFromSearch('?tab=graphic'), 'graphic')
assert.equal(readAppTabFromSearch('?tab=kuifou'), 'kuifou')
const recoveredParams = parsePreviewSearchParams(mangledSearch)
assert.equal(recoveredParams.get('tab'), 'data')
assert.equal(recoveredParams.get('post'), '1dac7255-16f2-413f-a84d-df3c2cadb87d')

console.log('preview url normalize/merge ok')
