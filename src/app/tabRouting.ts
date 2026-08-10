import type { AppMode } from '../components/TopModeTabs'
import {
  normalizePreviewUrl,
  parsePreviewSearchParams,
  recoverPreviewUrlInBrowser,
} from '../agent/supabaseHighlightSetup'

const TAB_IDS: Record<string, AppMode> = {
  graphic: 'graphic',
  data: 'data',
  kuifou: 'kuifou',
}

/** 从 URL 解析当前 Tab：?tab=graphic|data|kuifou（data = 社媒；缺省默认 data） */
export function readAppTabFromSearch(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): AppMode {
  const params = parsePreviewSearchParams(search)
  const raw = params.get('tab')?.trim().toLowerCase() ?? ''
  return TAB_IDS[raw] ?? 'data'
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
  /** 图文二级页：push 可 history.back；replace 为深链 */
  eraGraphicEntry?: 'push' | 'replace' | null
}

function currentHistoryState(): EraHistoryState {
  if (typeof window === 'undefined') return {}
  const state = window.history.state
  if (state && typeof state === 'object') return state as EraHistoryState
  return {}
}

/** 打开图文二级页：pushState，便于浏览器返回 / 边缘右滑返回 */
export function pushGraphicInUrl(): void {
  if (typeof window === 'undefined') return
  recoverPreviewUrlInBrowser()
  const url = new URL(normalizePreviewUrl(window.location.href))
  url.searchParams.set('tab', 'graphic')
  url.searchParams.delete('post')
  const nextState: EraHistoryState = {
    ...currentHistoryState(),
    eraSocialPost: null,
    eraSocialPostEntry: null,
    eraGraphicEntry: 'push',
  }
  window.history.pushState(nextState, '', `${url.pathname}${url.search}${url.hash}`)
  notifyUrlChange()
}

/** 关闭图文二级页 */
export function navigateBackFromGraphic(): void {
  if (typeof window === 'undefined') return
  if (readAppTabFromSearch() !== 'graphic') return
  const state = currentHistoryState()
  if (state.eraGraphicEntry === 'push') {
    window.history.back()
    return
  }
  replaceAppTabInUrl('data')
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
    eraGraphicEntry: null,
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
    eraGraphicEntry: null,
  }
  window.history.replaceState(nextState, '', `${url.pathname}${url.search}${url.hash}`)
  notifyUrlChange()
}

/** 写入 ?tab= */
export function replaceAppTabInUrl(
  tab: AppMode,
  options: {
    /** 是否保留社媒帖子 ?post=（默认切换 Tab 时清除） */
    keepSocialPost?: boolean
    /** 图文二级页入口标记（深链默认 replace） */
    graphicEntry?: 'push' | 'replace' | null
  } = {},
): void {
  if (typeof window === 'undefined') return
  recoverPreviewUrlInBrowser()
  const url = new URL(normalizePreviewUrl(window.location.href))
  url.searchParams.set('tab', tab)

  const keepSocialPost = options.keepSocialPost ?? false
  if (!keepSocialPost || tab !== 'data') {
    url.searchParams.delete('post')
  }

  const keptPost =
    keepSocialPost && tab === 'data' ? readSocialPostIdFromSearch(url.search) : null
  const graphicEntry =
    tab === 'graphic' ? (options.graphicEntry ?? 'replace') : null
  const nextState: EraHistoryState = {
    ...currentHistoryState(),
    eraSocialPost: keptPost,
    eraSocialPostEntry: keptPost ? 'replace' : null,
    eraGraphicEntry: graphicEntry,
  }
  window.history.replaceState(nextState, '', `${url.pathname}${url.search}${url.hash}`)
  notifyUrlChange()
}
