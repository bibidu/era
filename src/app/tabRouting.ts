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
  stitch: 'stitch',
}

/** 从 URL 解析当前 Tab：?tab=graphic|data|highlight|title|stitch（data = 社媒；缺省默认 data） */
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

/** pushState/replaceState 后同步壳层（顶栏 Tab 显隐等）；popstate 仍单独监听 */
export const ERA_URL_CHANGE_EVENT = 'era:urlchange'

function notifyUrlChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ERA_URL_CHANGE_EVENT))
}

/** 社媒帖子详情二级路由：?tab=data&post=<id> */
export function readSocialPostIdFromSearch(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  const params = parsePreviewSearchParams(search)
  return params.get('post')?.trim() || null
}

export type EraHistoryState = {
  eraSocialPost?: string | null
  /** push：列表点进详情可 back；replace：深链进入，返回时只清 query */
  eraSocialPostEntry?: 'push' | 'replace' | null
}

function currentHistoryState(): EraHistoryState {
  if (typeof window === 'undefined') return {}
  const state = window.history.state
  if (state && typeof state === 'object') return state as EraHistoryState
  return {}
}

/** 打开帖子详情：pushState，便于浏览器返回 / 左滑返回 */
export function pushSocialPostInUrl(postId: string): void {
  if (typeof window === 'undefined') return
  const trimmed = postId.trim()
  if (!trimmed) return
  recoverPreviewUrlInBrowser()
  const url = new URL(normalizePreviewUrl(window.location.href))
  url.searchParams.set('tab', 'data')
  url.searchParams.set('post', trimmed)
  const nextState: EraHistoryState = {
    ...currentHistoryState(),
    eraSocialPost: trimmed,
    eraSocialPostEntry: 'push',
  }
  window.history.pushState(nextState, '', `${url.pathname}${url.search}${url.hash}`)
  notifyUrlChange()
}

/** 关闭帖子详情：列表 push 进入用 history.back；深链进入时 replace 清掉 post */
export function navigateBackFromSocialPost(): void {
  if (typeof window === 'undefined') return
  const postId = readSocialPostIdFromSearch()
  if (!postId) return
  const state = currentHistoryState()
  if (state.eraSocialPost === postId && state.eraSocialPostEntry === 'push') {
    window.history.back()
    return
  }
  replaceSocialPostInUrl(null)
}

/** replaceState 写入/清除 ?post=（不增加历史栈） */
export function replaceSocialPostInUrl(postId: string | null): void {
  if (typeof window === 'undefined') return
  recoverPreviewUrlInBrowser()
  const url = new URL(normalizePreviewUrl(window.location.href))
  const trimmed = postId?.trim() || ''
  if (trimmed) {
    url.searchParams.set('tab', 'data')
    url.searchParams.set('post', trimmed)
  } else {
    url.searchParams.delete('post')
  }
  const nextState: EraHistoryState = {
    ...currentHistoryState(),
    eraSocialPost: trimmed || null,
    eraSocialPostEntry: trimmed ? 'replace' : null,
  }
  window.history.replaceState(nextState, '', `${url.pathname}${url.search}${url.hash}`)
  notifyUrlChange()
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
    /** 是否保留社媒帖子 ?post=（默认切换 Tab 时清除） */
    keepSocialPost?: boolean
  } = {},
): void {
  if (typeof window === 'undefined') return
  // 先还原二次编码，避免在 mangled query 上再 set tab=data 把 shareId 弄丢
  recoverPreviewUrlInBrowser()
  const url = new URL(normalizePreviewUrl(window.location.href))
  url.searchParams.set('tab', tab)

  const keepIds = options.keepHighlightIds ?? true
  const keepTitleText = options.keepTitleText ?? true
  const keepSocialPost = options.keepSocialPost ?? false
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

  if (!keepSocialPost || tab !== 'data') {
    url.searchParams.delete('post')
  }

  const keptPost =
    keepSocialPost && tab === 'data' ? readSocialPostIdFromSearch(url.search) : null
  const nextState: EraHistoryState = {
    ...currentHistoryState(),
    eraSocialPost: keptPost,
    eraSocialPostEntry: keptPost ? 'replace' : null,
  }
  window.history.replaceState(nextState, '', `${url.pathname}${url.search}${url.hash}`)
  notifyUrlChange()
}
