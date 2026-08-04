/**
 * 旧 Edge Function URL 解析 smoke（无 window 时回落直连 functions.supabase.co）
 */
import assert from 'node:assert/strict'
import {
  LEGACY_FUNCTIONS_HOST,
  legacyEdgeFunctionUrl,
} from '../src/agent/legacyEdgeFunctionUrl.ts'

assert.equal(
  legacyEdgeFunctionUrl('dashscope-video-extract'),
  `${LEGACY_FUNCTIONS_HOST}/dashscope-video-extract`,
)
assert.equal(
  legacyEdgeFunctionUrl('image-proxy'),
  `${LEGACY_FUNCTIONS_HOST}/image-proxy`,
)

console.log('legacy edge function url ok')
