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
import {
  fengshuiVideoObjectUrl,
  fengshuiVideoPreviewPagesUrl,
  isFengshuiPreviewTab,
  parseFengshuiVideoKey,
  readFengshuiVideoPreviewFromSearch,
} from '../src/features/fengshui/fengshuiVideoPreview.ts'

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
// 亏否已拆出独立站 /kuifou/，未知 tab 回落社媒
assert.equal(readAppTabFromSearch('?tab=kuifou'), 'data')
assert.equal(readAppTabFromSearch('?tab=fengshui&v=20260904-024720/fengshui-good-omens-elder.mp4'), 'data')
assert.equal(isFengshuiPreviewTab('?tab=fengshui&v=20260904-024720/fengshui-good-omens-elder.mp4'), true)
assert.equal(parseFengshuiVideoKey('20260904-024720/fengshui-good-omens-elder.mp4'), '20260904-024720/fengshui-good-omens-elder.mp4')
assert.equal(parseFengshuiVideoKey('https://evil.example/x.mp4'), null)
const fengshuiUrl = new URL(
  fengshuiVideoPreviewPagesUrl('20260904-024720/fengshui-good-omens-elder.mp4', '贵人来欠款还', selfBase),
)
assert.equal(fengshuiUrl.searchParams.get('tab'), 'fengshui')
assert.equal(fengshuiUrl.searchParams.get('v'), '20260904-024720/fengshui-good-omens-elder.mp4')
assert.equal(fengshuiUrl.searchParams.get('title'), '贵人来欠款还')
const preview = readFengshuiVideoPreviewFromSearch(fengshuiUrl.search)
assert.ok(preview)
assert.equal(preview.key, '20260904-024720/fengshui-good-omens-elder.mp4')
assert.equal(preview.src, fengshuiVideoObjectUrl(preview.key))
assert.equal(preview.title, '贵人来欠款还')
assert.equal(readFengshuiVideoPreviewFromSearch('?tab=fengshui'), null)
const recoveredParams = parsePreviewSearchParams(mangledSearch)
assert.equal(recoveredParams.get('tab'), 'data')
assert.equal(recoveredParams.get('post'), '1dac7255-16f2-413f-a84d-df3c2cadb87d')

console.log('preview url normalize/merge ok')
