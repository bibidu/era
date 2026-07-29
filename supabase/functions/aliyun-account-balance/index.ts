/**
 * 查询阿里云账户可用余额（BssOpenAPI QueryAccountBalance）。
 * DashScope / Qwen API Key 本身不提供余额接口，需 RAM AccessKey + bss:DescribeAcccount。
 *
 * Secrets（任选一组）:
 *   ALIYUN_ACCESS_KEY_ID + ALIYUN_ACCESS_KEY_SECRET
 *   或 OSS_ACCESS_KEY_ID + OSS_ACCESS_KEY_SECRET（须附加费用只读权限）
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface BssBalanceData {
  AvailableAmount?: string
  AvailableCashAmount?: string
  CreditAmount?: string
  MybankCreditAmount?: string
  Currency?: string
  QuotaLimit?: string
}

interface BssBalanceResponse {
  Code?: string
  Message?: string
  Success?: boolean
  RequestId?: string
  Data?: BssBalanceData
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  })
}

function percentEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

async function hmacSha1Base64(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  const bytes = new Uint8Array(sig)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

async function queryAccountBalance(accessKeyId: string, accessKeySecret: string) {
  const params: Record<string, string> = {
    Format: 'JSON',
    Version: '2017-12-14',
    AccessKeyId: accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    SignatureVersion: '1.0',
    SignatureNonce: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    Action: 'QueryAccountBalance',
  }

  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&')
  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonical)}`
  params.Signature = await hmacSha1Base64(`${accessKeySecret}&`, stringToSign)

  const url = `https://business.aliyuncs.com/?${new URLSearchParams(params).toString()}`
  const res = await fetch(url)
  const text = await res.text()
  let data: BssBalanceResponse = {}
  try {
    data = JSON.parse(text) as BssBalanceResponse
  } catch {
    data = { Message: text }
  }
  return { ok: res.ok && data.Success !== false && data.Code !== 'NotAuthorized', status: res.status, data, raw: text }
}

function resolveCredentials() {
  const id =
    Deno.env.get('ALIYUN_ACCESS_KEY_ID')?.trim() ||
    Deno.env.get('OSS_ACCESS_KEY_ID')?.trim() ||
    ''
  const secret =
    Deno.env.get('ALIYUN_ACCESS_KEY_SECRET')?.trim() ||
    Deno.env.get('OSS_ACCESS_KEY_SECRET')?.trim() ||
    ''
  return { id, secret }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { id, secret } = resolveCredentials()
    if (!id || !secret) {
      return jsonResponse(
        {
          error:
            'Server missing Aliyun AccessKey。请在 Supabase Secrets 配置 ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET（需 AliyunBSSReadOnlyAccess）。',
        },
        { status: 500 },
      )
    }

    const result = await queryAccountBalance(id, secret)
    if (!result.ok) {
      const message =
        result.data.Message ||
        result.raw ||
        `BssOpenAPI HTTP ${result.status}`
      return jsonResponse(
        {
          error: message,
          code: result.data.Code || null,
          requestId: result.data.RequestId || null,
          hint:
            result.data.Code === 'NotAuthorized'
              ? '当前 AccessKey 缺少费用只读权限，请为 RAM 用户附加 AliyunBSSReadOnlyAccess。'
              : null,
        },
        { status: result.status >= 400 ? result.status : 403 },
      )
    }

    const d = result.data.Data || {}
    return jsonResponse({
      availableAmount: d.AvailableAmount ?? null,
      availableCashAmount: d.AvailableCashAmount ?? null,
      creditAmount: d.CreditAmount ?? null,
      mybankCreditAmount: d.MybankCreditAmount ?? null,
      currency: d.Currency ?? 'CNY',
      quotaLimit: d.QuotaLimit ?? null,
      requestId: result.data.RequestId || null,
      source: 'aliyun-bss-QueryAccountBalance',
      note: '此为阿里云账户可用额度（含 DashScope/百炼扣费来源），非 DashScope API Key 专属额度。',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ error: message }, { status: 500 })
  }
})
