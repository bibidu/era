import type { AppMode } from '../components/TopModeTabs'

const TAB_IDS: Record<string, AppMode> = {
  graphic: 'graphic',
  data: 'data',
  highlight: 'highlight',
  title: 'title',
}

/** 从 URL 解析当前 Tab：?tab=graphic|data|highlight|title（data = 社媒；缺省默认 data） */
export function readAppTabFromSearch(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): AppMode {
  const params = new URLSearchParams(search)
  const raw = params.get('tab')?.trim().toLowerCase() ?? ''
  return TAB_IDS[raw] ?? 'data'
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

/** 写入 ?tab=；高亮相关 id 按需保留 */
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
