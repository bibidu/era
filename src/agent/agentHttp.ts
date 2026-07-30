import { ERA_AGENT_DEFAULT_HOST, ERA_AGENT_DEFAULT_PORT } from './protocol'
import {
  ERA_PUBLIC_BASE,
  highlightSetupPagesUrl,
  titleComposerPagesUrl,
} from './supabaseHighlightSetup'

/** 浏览器侧访问 Agent REST 的 base URL（与 Bridge WS 主机/端口一致） */
export function agentHttpBase(): string {
  const custom = import.meta.env.VITE_ERA_AGENT_HTTP as string | undefined
  if (custom) return custom.replace(/\/$/, '')
  const host = import.meta.env.VITE_ERA_AGENT_HOST ?? ERA_AGENT_DEFAULT_HOST
  const port = import.meta.env.VITE_ERA_AGENT_PORT ?? ERA_AGENT_DEFAULT_PORT
  return `http://${host}:${port}`
}

/** 本地调试用（含 projectId）；云端请用 shareId 的 EdgeOne 链接 */
export function highlightSetupPageUrl(projectId: string): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : `http://${import.meta.env.VITE_ERA_DEV_HOST ?? '127.0.0.1'}:${import.meta.env.VITE_ERA_DEV_PORT ?? '5173'}`
  const base = import.meta.env.BASE_URL || '/era/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const url = new URL(`${normalizedBase}`, `${origin}/`)
  url.searchParams.set('tab', 'highlight')
  url.searchParams.set('projectId', projectId)
  return url.toString()
}

export function highlightSetupSharePageUrl(shareId: string) {
  return highlightSetupPagesUrl(shareId, ERA_PUBLIC_BASE)
}

/** 标题排版页：注入当前帖子标题（EdgeOne 公网基址） */
export function titleComposerSharePageUrl(titleText: string) {
  return titleComposerPagesUrl(titleText, ERA_PUBLIC_BASE)
}

/** 本地调试用标题排版页（同源 + ?tab=title&text=） */
export function titleComposerLocalPageUrl(titleText: string): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : `http://${import.meta.env.VITE_ERA_DEV_HOST ?? '127.0.0.1'}:${import.meta.env.VITE_ERA_DEV_PORT ?? '5173'}`
  const base = import.meta.env.BASE_URL || '/era/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const url = new URL(`${normalizedBase}`, `${origin}/`)
  url.searchParams.set('tab', 'title')
  const text = titleText.replace(/\r\n/g, '\n').trim()
  if (text) url.searchParams.set('text', text)
  return url.toString()
}
