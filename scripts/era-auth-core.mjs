import crypto from 'node:crypto'
import { execSync } from 'node:child_process'

export const ERA_AUTH_COOKIE = 'era_auth'
export const ERA_AUTH_HEADER = 'X-Era-Auth'

/** 与库表种子一致；PostgREST 不可达时用于本地校验 */
export const ERA_BUILTIN_LOGIN = Object.freeze({
  username: '17718139319',
  password: '521312',
})

export function computeEraAuthHash(username, password) {
  const data = `${String(username).trim()}:${String(password)}`
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex')
}

function builtinAuthHash() {
  return computeEraAuthHash(ERA_BUILTIN_LOGIN.username, ERA_BUILTIN_LOGIN.password)
}

export function knownAuthHashes() {
  const set = new Set([builtinAuthHash()])
  const fromEnv = process.env.ERA_AUTH_HASH?.trim()
  if (fromEnv) set.add(fromEnv)
  for (const part of (process.env.ERA_AUTH_HASHES || '').split(',')) {
    const h = part.trim()
    if (h) set.add(h)
  }
  return set
}

export function isKnownAuthHash(token) {
  if (!token) return false
  return knownAuthHashes().has(token)
}

export function localLogin(username, password) {
  const u = String(username).trim()
  const p = String(password)
  if (u === ERA_BUILTIN_LOGIN.username && p === ERA_BUILTIN_LOGIN.password) {
    return builtinAuthHash()
  }
  return null
}

export function discoverPostgrestBase() {
  try {
    const ip = execSync(
      "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' era-rest",
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim()
    if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
      return `http://${ip}:3000`
    }
  } catch {
    // ignore
  }
  return null
}

export function resolvePostgrestBases() {
  const fromEnv = (process.env.ERA_REST_INTERNAL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const discovered = discoverPostgrestBase()
  const defaults = ['http://127.0.0.1:54321']
  const merged = [...fromEnv, ...(discovered ? [discovered] : []), ...defaults]
  return [...new Set(merged.map((b) => b.replace(/\/$/, '')))]
}

export function restProxyBase() {
  return discoverPostgrestBase() || resolvePostgrestBases()[0] || 'http://127.0.0.1:54321'
}

export function parseCookies(cookieHeader) {
  const out = {}
  if (!cookieHeader) return out
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    out[key] = decodeURIComponent(val)
  }
  return out
}

export function readAuthTokenFromRequest(req) {
  const header = req.headers[ERA_AUTH_HEADER.toLowerCase()]
  if (typeof header === 'string' && header.trim()) return header.trim()
  const cookies = parseCookies(req.headers.cookie)
  const fromCookie = cookies[ERA_AUTH_COOKIE]
  return typeof fromCookie === 'string' && fromCookie.trim() ? fromCookie.trim() : null
}

export async function restRpc(restBase, anonKey, fn, body) {
  const base = restBase.replace(/\/$/, '')
  const res = await fetch(`${base}/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`REST rpc ${fn} ${res.status}: ${text || res.statusText}`)
  }
  if (!text) return null
  return JSON.parse(text)
}

async function restRpcAny(bases, anonKey, fn, body) {
  let lastError
  for (const base of bases) {
    try {
      return await restRpc(base, anonKey, fn, body)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('PostgREST 不可用')
}

export async function isAuthTokenValid(token, _restBaseUnused, anonKey) {
  if (!token) return false
  if (isKnownAuthHash(token)) return true
  const bases = resolvePostgrestBases()
  try {
    const ok = await restRpcAny(bases, anonKey, 'era_app_auth_valid', { p_hash: token })
    return ok === true
  } catch {
    return isKnownAuthHash(token)
  }
}

export async function loginWithCredentials(username, password, _restBaseUnused, anonKey) {
  const bases = resolvePostgrestBases()
  try {
    const result = await restRpcAny(bases, anonKey, 'era_app_login', {
      p_username: String(username).trim(),
      p_password: String(password),
    })
    if (result?.ok && result.authHash) return String(result.authHash)
  } catch {
    // fall through
  }
  return localLogin(username, password)
}

/** Node fetch 会自动解压 gzip/br；这些头不能原样回传，否则客户端按压缩长度截断 JSON */
export const PROXY_STRIP_RES_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'transfer-encoding',
  'content-encoding',
  'content-length',
  // 上游 Set-Cookie（如 supabase.co Domain）不可泄露给浏览器
  'set-cookie',
])

export function sanitizeProxyResponseHeaders(upstreamHeaders, bodyByteLength) {
  const out = {}
  for (const [k, v] of upstreamHeaders.entries()) {
    if (PROXY_STRIP_RES_HEADERS.has(k.toLowerCase())) continue
    out[k] = v
  }
  out['content-length'] = String(bodyByteLength)
  return out
}
