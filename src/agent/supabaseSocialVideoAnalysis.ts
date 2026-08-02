import { browserSupabaseConfig, resolveSupabaseConfig } from './supabaseHighlightSetup'

export const ERA_SOCIAL_VIDEO_ANALYSES_TABLE = 'era_social_video_analyses'

/** 发布状态（存库中文枚举） */
export const SOCIAL_VIDEO_PUBLISH_STATUSES = ['已发布', '待AI修改'] as const
export type SocialVideoPublishStatus = (typeof SOCIAL_VIDEO_PUBLISH_STATUSES)[number]

/** 作品类型（存库中文枚举） */
export const SOCIAL_VIDEO_WORK_TYPES = ['图文', '风水', '健身'] as const
export type SocialVideoWorkType = (typeof SOCIAL_VIDEO_WORK_TYPES)[number]

export const DEFAULT_SOCIAL_VIDEO_PUBLISH_STATUS: SocialVideoPublishStatus = '待AI修改'
export const DEFAULT_SOCIAL_VIDEO_WORK_TYPE: SocialVideoWorkType = '图文'

export interface SocialVideoAnalysisRecord {
  id: string
  created_at: string
  title: string
  published_at: string
  cover_url: string | null
  markdown?: string
  outline?: string
  /** 图片预览 URL 列表（封面/内容图等） */
  image_previews?: string[]
  publish_status: SocialVideoPublishStatus
  work_type: SocialVideoWorkType
}

export interface CreateSocialVideoAnalysisInput {
  title: string
  publishedAt: string
  coverUrl?: string | null
  markdown: string
  outline?: string
  imagePreviews?: string[]
  publishStatus?: SocialVideoPublishStatus
  workType?: SocialVideoWorkType
}

export interface ListSocialVideoAnalysesOptions {
  /** 不传或空 = 全部；后端 eq 筛选 */
  publishStatus?: SocialVideoPublishStatus | '' | null
  /** 不传或空 = 全部；后端 eq 筛选 */
  workType?: SocialVideoWorkType | '' | null
  /** 复盘等需要全文时拉 markdown */
  includeMarkdown?: boolean
}

const LIST_SELECT_BASE =
  'id,created_at,title,published_at,cover_url,publish_status,work_type,outline,image_previews'
const LIST_SELECT_WITH_MARKDOWN = `${LIST_SELECT_BASE},markdown`

const NETWORK_ERROR_MARKERS = ['failed to fetch', 'networkerror', 'load failed', 'network request failed']

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    error instanceof TypeError ||
    NETWORK_ERROR_MARKERS.some((marker) => message.includes(marker))
  )
}

export function formatSocialVideoLoadError(error: unknown, fallback = '加载失败'): string {
  if (isTransientNetworkError(error)) {
    return '网络不稳定，请稍后重试'
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const FETCH_TIMEOUT_MS = 10_000

async function fetchSupabase(
  url: string,
  init: RequestInit,
  retries = 2,
): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const onAbort = () => controller.abort()
    if (init.signal) {
      if (init.signal.aborted) controller.abort()
      else init.signal.addEventListener('abort', onAbort, { once: true })
    }
    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
      const aborted =
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.name === 'AbortError')
      lastError = aborted ? new TypeError('Failed to fetch') : error
      if (attempt >= retries || !isTransientNetworkError(lastError)) {
        throw lastError
      }
      await sleep(280 * (attempt + 1))
    } finally {
      clearTimeout(timeoutId)
      init.signal?.removeEventListener('abort', onAbort)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('网络请求失败')
}

async function supabaseRest<T>(
  config: { url: string; anonKey: string },
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('apikey', config.anonKey)
  headers.set('Authorization', `Bearer ${config.anonKey}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (init.prefer) headers.set('Prefer', init.prefer)

  const res = await fetchSupabase(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers,
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${text || res.statusText}`)
  }
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

function normalizePublishStatus(value: unknown): SocialVideoPublishStatus {
  if (typeof value === 'string' && (SOCIAL_VIDEO_PUBLISH_STATUSES as readonly string[]).includes(value)) {
    return value as SocialVideoPublishStatus
  }
  // 历史「待审核」统一视为待 AI 修改
  if (value === '待审核') return '待AI修改'
  return DEFAULT_SOCIAL_VIDEO_PUBLISH_STATUS
}

function normalizeWorkType(value: unknown): SocialVideoWorkType {
  if (typeof value === 'string' && (SOCIAL_VIDEO_WORK_TYPES as readonly string[]).includes(value)) {
    return value as SocialVideoWorkType
  }
  return DEFAULT_SOCIAL_VIDEO_WORK_TYPE
}

function normalizeImagePreviews(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function normalizeRecord(row: SocialVideoAnalysisRecord): SocialVideoAnalysisRecord {
  return {
    ...row,
    outline: typeof row.outline === 'string' ? row.outline : '',
    image_previews: normalizeImagePreviews(row.image_previews),
    publish_status: normalizePublishStatus(row.publish_status),
    work_type: normalizeWorkType(row.work_type),
  }
}

export async function listSocialVideoAnalyses(
  options: ListSocialVideoAnalysesOptions = {},
  config = browserSupabaseConfig(),
): Promise<SocialVideoAnalysisRecord[]> {
  const params = new URLSearchParams()
  // 列表默认不拉 markdown，避免大字段导致 Safari 偶发 Load failed
  params.set('select', options.includeMarkdown ? LIST_SELECT_WITH_MARKDOWN : LIST_SELECT_BASE)
  params.set('order', 'created_at.desc')
  const status = options.publishStatus?.trim()
  if (status) {
    params.set('publish_status', `eq.${status}`)
  }
  const workType = options.workType?.trim()
  if (workType) {
    params.set('work_type', `eq.${workType}`)
  }

  const rows = await supabaseRest<SocialVideoAnalysisRecord[]>(
    config,
    `${ERA_SOCIAL_VIDEO_ANALYSES_TABLE}?${params.toString()}`,
    { method: 'GET' },
  )
  return (rows ?? []).map(normalizeRecord)
}

export async function getSocialVideoAnalysis(
  id: string,
  config = browserSupabaseConfig(),
): Promise<SocialVideoAnalysisRecord> {
  const rows = await supabaseRest<SocialVideoAnalysisRecord[]>(
    config,
    `${ERA_SOCIAL_VIDEO_ANALYSES_TABLE}?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    { method: 'GET' },
  )
  const record = rows[0]
  if (!record?.id) {
    throw new Error('未找到该分析作品')
  }
  return normalizeRecord(record)
}

export async function createSocialVideoAnalysis(
  input: CreateSocialVideoAnalysisInput,
  config = browserSupabaseConfig(),
): Promise<SocialVideoAnalysisRecord> {
  const rows = await supabaseRest<SocialVideoAnalysisRecord[]>(
    config,
    ERA_SOCIAL_VIDEO_ANALYSES_TABLE,
    {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        title: input.title,
        published_at: input.publishedAt,
        cover_url: input.coverUrl ?? null,
        markdown: input.markdown,
        outline: input.outline ?? '',
        image_previews: input.imagePreviews ?? [],
        publish_status: input.publishStatus ?? DEFAULT_SOCIAL_VIDEO_PUBLISH_STATUS,
        work_type: input.workType ?? DEFAULT_SOCIAL_VIDEO_WORK_TYPE,
      }),
    },
  )
  const record = rows[0]
  if (!record?.id) {
    throw new Error('保存失败：Supabase 未返回记录 id')
  }
  return normalizeRecord(record)
}

export async function updateSocialVideoAnalysis(
  id: string,
  input: CreateSocialVideoAnalysisInput,
  config = browserSupabaseConfig(),
): Promise<SocialVideoAnalysisRecord> {
  const rows = await supabaseRest<SocialVideoAnalysisRecord[]>(
    config,
    `${ERA_SOCIAL_VIDEO_ANALYSES_TABLE}?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify({
        title: input.title,
        published_at: input.publishedAt,
        cover_url: input.coverUrl ?? null,
        markdown: input.markdown,
        outline: input.outline ?? '',
        image_previews: input.imagePreviews ?? [],
        publish_status: input.publishStatus ?? DEFAULT_SOCIAL_VIDEO_PUBLISH_STATUS,
        work_type: input.workType ?? DEFAULT_SOCIAL_VIDEO_WORK_TYPE,
      }),
    },
  )
  const record = rows[0]
  if (!record?.id) {
    throw new Error('保存失败：Supabase 未返回记录 id')
  }
  return normalizeRecord(record)
}

/** 按 id 删除社媒分析记录 */
export async function deleteSocialVideoAnalysis(
  id: string,
  config = browserSupabaseConfig(),
): Promise<void> {
  const trimmed = id.trim()
  if (!trimmed) {
    throw new Error('缺少要删除的记录 id')
  }
  await supabaseRest(
    config,
    `${ERA_SOCIAL_VIDEO_ANALYSES_TABLE}?id=eq.${encodeURIComponent(trimmed)}`,
    { method: 'DELETE' },
  )
}

export function sortSocialVideoAnalyses(records: SocialVideoAnalysisRecord[]) {
  return [...records].sort((left, right) => {
    const leftTime = parsePublishedAtSortKey(left.published_at, left.created_at)
    const rightTime = parsePublishedAtSortKey(right.published_at, right.created_at)
    if (rightTime !== leftTime) {
      return rightTime - leftTime
    }
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  })
}

export function parsePublishedAtSortKey(publishedAt: string, fallbackCreatedAt: string) {
  const normalized = publishedAt.trim()
  if (!normalized) {
    return new Date(fallbackCreatedAt).getTime()
  }

  const direct = Date.parse(normalized)
  if (!Number.isNaN(direct)) {
    return direct
  }

  const chineseMatch = normalized.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (chineseMatch) {
    const [, year, month, day] = chineseMatch
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime()
  }

  const slashMatch = normalized.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/)
  if (slashMatch) {
    const [, year, month, day] = slashMatch
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime()
  }

  return new Date(fallbackCreatedAt).getTime()
}

export { resolveSupabaseConfig }
