declare global {
  interface Window {
    __ERA_BUILD__?: string
  }
}

const VERSION_URL = 'https://raw.githubusercontent.com/bibidu/era/gh-pages/version.json'
const RELOAD_KEY = 'era-version-reload'

export async function checkForNewVersion() {
  if (!import.meta.env.PROD) return

  const localBuild = window.__ERA_BUILD__
  if (!localBuild) return

  try {
    const response = await fetch(VERSION_URL, { cache: 'no-store' })
    if (!response.ok) return

    const data = (await response.json()) as { version?: string }
    if (!data.version || data.version === localBuild) return

    if (sessionStorage.getItem(RELOAD_KEY) === data.version) return

    sessionStorage.setItem(RELOAD_KEY, data.version)
    window.location.reload()
  } catch {
    // Ignore network errors and keep the current session usable.
  }
}
