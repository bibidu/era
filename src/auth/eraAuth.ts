/** 与 scripts/era-auth-core.mjs 保持一致的 session 算法与 cookie 名 */

export const ERA_AUTH_COOKIE = 'era_auth'
export const ERA_AUTH_HEADER = 'X-Era-Auth'

export async function computeEraAuthHashAsync(username: string, password: string): Promise<string> {
  const data = `${username.trim()}:${password}`
  const encoded = new TextEncoder().encode(data)
  const buf = await globalThis.crypto.subtle.digest('SHA-256', encoded)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function readEraAuthTokenFromDocument(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${ERA_AUTH_COOKIE}=([^;]*)`))
  const raw = match?.[1]
  return raw ? decodeURIComponent(raw) : null
}

export function writeEraAuthCookie(token: string, maxAgeSec = 60 * 60 * 24 * 30): void {
  if (typeof document === 'undefined') return
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${ERA_AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`
}

export function clearEraAuthCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${ERA_AUTH_COOKIE}=; Path=/; Max-Age=0`
}

export function eraAuthHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  const token = readEraAuthTokenFromDocument()
  if (token) headers.set(ERA_AUTH_HEADER, token)
  return headers
}

export function fetchWithEraAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: eraAuthHeaders(init.headers),
    credentials: init.credentials ?? 'same-origin',
  })
}
