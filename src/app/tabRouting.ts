import type { AppMode } from '../components/TopModeTabs'

const TAB_ALIASES: Record<string, AppMode> = {
  graphic: 'graphic',
  图文: 'graphic',
  data: 'data',
  analysis: 'data',
  数据分析: 'data',
  highlight: 'highlight',
  'highlight-setup': 'highlight',
  高亮: 'highlight',
}

/** 从 URL 解析当前 Tab；支持 ?tab= 与旧参数兼容 */
export function readAppTabFromSearch(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): AppMode {
  const params = new URLSearchParams(search)
  const raw = params.get('tab')?.trim().toLowerCase() ?? ''
  if (raw && TAB_ALIASES[raw]) return TAB_ALIASES[raw]
  // 中文 tab 值未 lower-case 时再试一遍
  const rawExact = params.get('tab')?.trim() ?? ''
  if (rawExact && TAB_ALIASES[rawExact]) return TAB_ALIASES[rawExact]

  if (
    params.get('highlightSetup') === '1' ||
    params.get('highlightSetup') === 'true' ||
    params.get('mode') === 'highlight-setup'
  ) {
    return 'highlight'
  }
  // 旧独立页 ?tool=social-video → 数据分析 Tab
  if (params.get('tool') === 'social-video') return 'data'
  return 'graphic'
}

export function readHighlightIdsFromSearch(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): { shareId: string | null; projectId: string | null } {
  const params = new URLSearchParams(search)
  return {
    shareId: params.get('shareId')?.trim() || null,
    projectId: params.get('projectId')?.trim() || null,
  }
}

/** 写入 ?tab=，并清理已废弃的独立页参数；高亮相关 id 按需保留 */
export function replaceAppTabInUrl(
  tab: AppMode,
  options: {
    shareId?: string | null
    projectId?: string | null
    /** 非高亮 Tab 时是否仍保留 shareId/projectId（默认保留，方便切回高亮） */
    keepHighlightIds?: boolean
  } = {},
): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('tab', tab)

  url.searchParams.delete('highlightSetup')
  url.searchParams.delete('tool')
  url.searchParams.delete('exportShare')
  url.searchParams.delete('mode')

  const keepIds = options.keepHighlightIds ?? true
  const shareId = options.shareId
  const projectId = options.projectId

  if (tab === 'highlight' || keepIds) {
    if (shareId) url.searchParams.set('shareId', shareId)
    else if (options.shareId === null) url.searchParams.delete('shareId')

    if (projectId) url.searchParams.set('projectId', projectId)
    else if (options.projectId === null) url.searchParams.delete('projectId')
  } else {
    url.searchParams.delete('shareId')
    url.searchParams.delete('projectId')
  }

  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}
