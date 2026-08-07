import { useState } from 'react'

type Props = {
  onLogin: (username: string, password: string) => Promise<void>
}

export function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onLogin(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4"
      style={{ background: '#ffffff', color: '#0d0d0d' }}
    >
      <div className="w-full max-w-[360px]">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div
            className="flex size-12 items-center justify-center rounded-xl"
            style={{ background: '#0d0d0d' }}
            aria-hidden
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3L4 9v12h16V9L12 3z"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight">Cursor App</h1>
          <p className="text-center text-sm" style={{ color: '#6e6e80' }}>
            登录以继续
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm" style={{ color: '#0d0d0d' }}>
            <span className="sr-only">账号</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              placeholder="账号"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border px-3 py-3 text-[15px] outline-none transition-shadow focus:ring-2"
              style={{
                borderColor: '#ececf1',
                background: '#fff',
                boxShadow: '0 0 0 0 transparent',
              }}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="sr-only">密码</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-3 text-[15px] outline-none transition-shadow focus:ring-2"
              style={{
                borderColor: '#ececf1',
                background: '#fff',
              }}
              required
            />
          </label>

          {error ? (
            <p className="text-center text-sm" style={{ color: '#ef4444' }} role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-lg py-3 text-[15px] font-medium transition-opacity disabled:opacity-60"
            style={{ background: '#0d0d0d', color: '#fff' }}
          >
            {loading ? '登录中…' : '继续'}
          </button>
        </form>
      </div>
    </div>
  )
}
