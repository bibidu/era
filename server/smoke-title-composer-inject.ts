/**
 * 标题排版文案注入 smoke：createDocumentFromPlainText / titleComposerPagesUrl
 */
import assert from 'node:assert/strict'
import {
  createDocumentFromPlainText,
  createInitialTitleDocument,
  documentPlainText,
} from '../src/features/title-composer/model.ts'
import { titleComposerPagesUrl } from '../src/agent/supabaseHighlightSetup.ts'

const single = createDocumentFromPlainText('厨房别放西北角')
assert.equal(documentPlainText(single), '厨房别放西北角')
assert.equal(single.lines.length, 1)
assert.notEqual(documentPlainText(single).includes('西北绝不能'), true)

const multi = createDocumentFromPlainText('西北不能做厨房\n火烧天门\n八宅大忌')
assert.equal(multi.lines.length, 3)
assert.equal(multi.lines[1].fontSize, 88)

const fallback = createInitialTitleDocument('')
assert.ok(documentPlainText(fallback).includes('西北绝不能'))

const injected = createInitialTitleDocument('当前帖子标题ABC')
assert.equal(documentPlainText(injected), '当前帖子标题ABC')

const url = titleComposerPagesUrl('厨房别放西北角')
assert.ok(url.includes('tab=title'))
assert.ok(url.includes('text='))
assert.ok(decodeURIComponent(url).includes('厨房别放西北角'))
assert.ok(!url.includes('西北绝不能'))

console.log('title-composer inject smoke ok')
