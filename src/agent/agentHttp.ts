import { ERA_AGENT_DEFAULT_HOST, ERA_AGENT_DEFAULT_PORT } from './protocol'
import {
  ERA_GITHUB_PAGES_BASE,
  highlightSetupPagesUrl,
} from './supabaseHighlightSetup'

/** 浏览器侧访问 Agent REST 的 base URL（与 Bridge WS 主机/端口一致） */
export function agentHttpBase(): string {
  const custom = import.meta.env.VITE_ERA_AGENT_HTTP as string | undefined
  if (custom) return custom.replace(/\/$/, '')
  const host = import.meta.env.VITE_ERA_AGENT_HOST ?? ERA_AGENT_DEFAULT_HOST
  const port = import.meta.env.VITE_ERA_AGENT_PORT ?? ERA_AGENT_DEFAULT_PORT
  return `http://${host}:${port}`
}

/** 本地调试用（含 projectId）；云端请用 shareId 的 GitHub Pages 链接 */
export function highlightSetupPageUrl(projectId: string): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : `http://${import.meta.env.VITE_ERA_DEV_HOST ?? '127.0.0.1'}:${import.meta.env.VITE_ERA_DEV_PORT ?? '5173'}`
  const base = import.meta.env.BASE_URL || '/era/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const url = new URL(`${normalizedBase}`, `${origin}/`)
  url.searchParams.set('highlightSetup', '1')
  url.searchParams.set('projectId', projectId)
  return url.toString()
}

export function highlightSetupSharePageUrl(shareId: string) {
  return highlightSetupPagesUrl(shareId, ERA_GITHUB_PAGES_BASE)
}

export function readHighlightSetupQuery(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): { enabled: boolean; projectId: string | null; shareId: string | null } {
  const params = new URLSearchParams(search)
  const enabled =
    params.get('highlightSetup') === '1' ||
    params.get('highlightSetup') === 'true' ||
    params.get('mode') === 'highlight-setup'
  const projectId = params.get('projectId')?.trim() || null
  const shareId = params.get('shareId')?.trim() || null
  return { enabled, projectId, shareId }
}
