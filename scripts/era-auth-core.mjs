import crypto from 'node:crypto'

export const ERA_AUTH_COOKIE = 'era_auth'
export const ERA_AUTH_HEADER = 'X-Era-Auth'

export function computeEraAuthHash(username, password) {
  const data = `${String(username).trim()}:${String(password)}`
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex')
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

export async function isAuthTokenValid(token, restBase, anonKey) {
  if (!token) return false
  try {
    const ok = await restRpc(restBase, anonKey, 'era_app_auth_valid', { p_hash: token })
    return ok === true
  } catch {
    return false
  }
}

export async function loginWithCredentials(username, password, restBase, anonKey) {
  const result = await restRpc(restBase, anonKey, 'era_app_login', {
    p_username: String(username).trim(),
    p_password: String(password),
  })
  if (!result?.ok || !result.authHash) return null
  return String(result.authHash)
}
