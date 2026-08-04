/**
 * 旧 Supabase Edge Functions URL。
 * 自建站 / 本地开发走同机反代 `/functions/v1/<name>`，避免浏览器直连美东 functions.supabase.co 失败。
 */
export const LEGACY_FUNCTIONS_HOST = 'https://kzoxyextxjwscrpjowud.functions.supabase.co'

function shouldUseSameOriginProxy(hostname: string): boolean {
  if (!hostname) return false
  if (hostname === '39.106.179.17') return true
  if (hostname.endsWith('.sslip.io')) return true
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  return false
}

/** 解析 Edge Function 调用地址（含 query 时用 URL 对象再拼） */
export function legacyEdgeFunctionUrl(functionName: string): string {
  const name = functionName.replace(/^\/+/, '').trim()
  if (!name) throw new Error('functionName required')

  if (typeof window !== 'undefined' && shouldUseSameOriginProxy(window.location.hostname)) {
    return `${window.location.origin}/functions/v1/${name}`
  }

  return `${LEGACY_FUNCTIONS_HOST}/${name}`
}
