import { type ReactNode, useCallback, useEffect, useState } from 'react'
import {
  clearEraAuthCookie,
  computeEraAuthHashAsync,
  readEraAuthTokenFromDocument,
  writeEraAuthCookie,
} from '../../auth/eraAuth'
import { LoginPage } from './LoginPage'

type AuthState = 'checking' | 'authed' | 'guest'

async function verifySession(): Promise<boolean> {
  const token = readEraAuthTokenFromDocument()
  if (!token) return false
  try {
    const res = await fetch('/auth/session', {
      headers: { 'X-Era-Auth': token },
      credentials: 'same-origin',
    })
    if (!res.ok) return false
    const data = (await res.json()) as { ok?: boolean }
    return Boolean(data.ok)
  } catch {
    return false
  }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('checking')

  const refresh = useCallback(async () => {
    setState('checking')
    const ok = await verifySession()
    setState(ok ? 'authed' : 'guest')
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleLogin = useCallback(async (username: string, password: string) => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(err.error || '登录失败')
    }
    const data = (await res.json()) as { authHash?: string }
    const hash =
      data.authHash ||
      (await computeEraAuthHashAsync(username, password))
    writeEraAuthCookie(hash)
    setState('authed')
  }, [])

  if (state === 'checking') {
    return (
      <div
        className="flex min-h-dvh items-center justify-center text-sm"
        style={{ background: '#fff', color: '#6e6e80' }}
      >
        加载中…
      </div>
    )
  }

  if (state === 'guest') {
    return <LoginPage onLogin={handleLogin} />
  }

  return <>{children}</>
}

export function useEraLogout() {
  return useCallback(() => {
    clearEraAuthCookie()
    window.location.reload()
  }, [])
}
