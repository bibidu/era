declare global {
  interface Window {
    __ERA_BUILD__?: string
    __ERA_APP_MOUNTED__?: boolean
  }
}

const VERSION_URL = 'https://raw.githubusercontent.com/bibidu/era/gh-pages/version.json'
const RELOAD_KEY = 'era-version-reload'
const REFRESH_PARAM = 'era_refresh'
const VERSION_CHECK_TIMEOUT_MS = 2500

function bustCacheAndReload(version: string) {
  const url = new URL(window.location.href)
  const refreshToken = version.slice(0, 12)
  if (url.searchParams.get(REFRESH_PARAM) === refreshToken) return

  url.searchParams.set(REFRESH_PARAM, refreshToken)
  window.location.replace(url.toString())
}

export async function checkForNewVersion() {
  if (!import.meta.env.PROD) return

  const localBuild = window.__ERA_BUILD__
  if (!localBuild) return

  try {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), VERSION_CHECK_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(VERSION_URL, { cache: 'no-store', signal: controller.signal })
    } finally {
      window.clearTimeout(timeoutId)
    }
    if (!response.ok) return

    const data = (await response.json()) as { version?: string }
    if (!data.version) return

    if (data.version === localBuild) {
      sessionStorage.removeItem(RELOAD_KEY)
      return
    }

    if (sessionStorage.getItem(RELOAD_KEY) === data.version) {
      bustCacheAndReload(data.version)
      return
    }

    sessionStorage.setItem(RELOAD_KEY, data.version)
    window.location.reload()
  } catch {
    // Ignore network errors and keep the current session usable.
  }
}
