import type { AppMode } from '../components/TopModeTabs'
import {
  normalizePreviewUrl,
  parsePreviewSearchParams,
  recoverPreviewUrlInBrowser,
} from '../agent/supabaseHighlightSetup'

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
  const params = parsePreviewSearchParams(search)
  const raw = params.get('tab')?.trim().toLowerCase() ?? ''
  return TAB_IDS[raw] ?? 'data'
}

export function readHighlightIdsFromSearch(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): { shareId: string | null; projectId: string | null } {
  const params = parsePreviewSearchParams(search)
  return {
    shareId: params.get('shareId')?.trim() || null,
    projectId: params.get('projectId')?.trim() || null,
  }
}

/**
 * 标题 Tab 注入文案：?tab=title&text=当前帖子标题
 * 兼容别名 `title`；换行可用字面 \\n 或真实换行（URL 编码 %0A）
 */
export function readTitleTextFromSearch(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  const params = parsePreviewSearchParams(search)
  const raw = params.get('text') ?? params.get('title')
  if (raw == null) return null
  const normalized = raw.replace(/\\n/g, '\n').trim()
  return normalized.length > 0 ? normalized : null
}

/** 写入 ?tab=；高亮相关 id / 标题注入文案按需保留 */
export function replaceAppTabInUrl(
  tab: AppMode,
  options: {
    shareId?: string | null
    projectId?: string | null
    /** 标题 Tab 注入的帖子标题（?text=） */
    titleText?: string | null
    /** 非高亮 Tab 时是否仍保留 shareId/projectId（默认保留，方便切回高亮） */
    keepHighlightIds?: boolean
    /** 非标题 Tab 时是否仍保留 text（默认保留，方便切回标题） */
    keepTitleText?: boolean
  } = {},
): void {
  if (typeof window === 'undefined') return
  // 先还原二次编码，避免在 mangled query 上再 set tab=data 把 shareId 弄丢
  recoverPreviewUrlInBrowser()
  const url = new URL(normalizePreviewUrl(window.location.href))
  url.searchParams.set('tab', tab)

  const keepIds = options.keepHighlightIds ?? true
  const keepTitleText = options.keepTitleText ?? true
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

  if (tab === 'title' || keepTitleText) {
    if (options.titleText !== undefined) {
      const next = options.titleText?.trim()
      if (next) {
        url.searchParams.set('text', next)
        url.searchParams.delete('title')
      } else if (options.titleText === null || options.titleText === '') {
        url.searchParams.delete('text')
        url.searchParams.delete('title')
      }
    }
  } else {
    url.searchParams.delete('text')
    url.searchParams.delete('title')
  }

  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}
