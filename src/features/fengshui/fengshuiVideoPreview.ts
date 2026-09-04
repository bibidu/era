import {
  buildAppPagesUrl,
  parsePreviewSearchParams,
  resolvePublicPagesBase,
} from '../../agent/supabaseHighlightSetup'

export const FENGSHUI_OSS_ASSET_BASE =
  'https://agent-17718139319.oss-cn-beijing.aliyuncs.com/era/assets/'

const VIDEO_KEY_RE = /^(\d{8}-\d{6})\/([A-Za-z0-9._-]+\.mp4)$/

export type FengshuiVideoPreview = {
  key: string
  src: string
  title: string
}

export function parseFengshuiVideoKey(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? ''
  if (!value) return null
  if (VIDEO_KEY_RE.test(value)) return value
  try {
    const url = new URL(value)
    const marker = '/era/assets/'
    const index = url.pathname.indexOf(marker)
    if (index === -1) return null
    const key = decodeURIComponent(url.pathname.slice(index + marker.length))
    return VIDEO_KEY_RE.test(key) ? key : null
  } catch {
    return null
  }
}

export function fengshuiVideoObjectUrl(key: string): string {
  return `${FENGSHUI_OSS_ASSET_BASE}${key}`
}

export function isFengshuiPreviewTab(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): boolean {
  return parsePreviewSearchParams(search).get('tab')?.trim().toLowerCase() === 'fengshui'
}

export function readFengshuiVideoPreviewFromSearch(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): FengshuiVideoPreview | null {
  const params = parsePreviewSearchParams(search)
  if (params.get('tab')?.trim().toLowerCase() !== 'fengshui') return null
  const key = parseFengshuiVideoKey(params.get('v'))
  if (!key) return null
  const title = (params.get('title') ?? '').trim().slice(0, 40)
  return {
    key,
    src: fengshuiVideoObjectUrl(key),
    title: title || '风水竖版成片',
  }
}

export function fengshuiVideoPreviewPagesUrl(
  key: string,
  title?: string,
  pagesBase: string = resolvePublicPagesBase(),
): string {
  const parsed = parseFengshuiVideoKey(key)
  if (!parsed) {
    throw new Error('fengshui preview requires a dated OSS mp4 key')
  }
  return buildAppPagesUrl(pagesBase, {
    tab: 'fengshui',
    v: parsed,
    title: title?.trim() || undefined,
  })
}
