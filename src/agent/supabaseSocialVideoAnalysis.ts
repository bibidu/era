import { browserSupabaseConfig, resolveSupabaseConfig } from './supabaseHighlightSetup'

export const ERA_SOCIAL_VIDEO_ANALYSES_TABLE = 'era_social_video_analyses'

/** 发布状态（存库中文枚举） */
export const SOCIAL_VIDEO_PUBLISH_STATUSES = ['已发布', '待审核', '待AI修改'] as const
export type SocialVideoPublishStatus = (typeof SOCIAL_VIDEO_PUBLISH_STATUSES)[number]

/** 作品类型（存库中文枚举） */
export const SOCIAL_VIDEO_WORK_TYPES = ['图文', '风水'] as const
export type SocialVideoWorkType = (typeof SOCIAL_VIDEO_WORK_TYPES)[number]

export const DEFAULT_SOCIAL_VIDEO_PUBLISH_STATUS: SocialVideoPublishStatus = '待审核'
export const DEFAULT_SOCIAL_VIDEO_WORK_TYPE: SocialVideoWorkType = '图文'

export interface SocialVideoAnalysisRecord {
  id: string
  created_at: string
  title: string
  published_at: string
  cover_url: string | null
  markdown?: string
  publish_status: SocialVideoPublishStatus
  work_type: SocialVideoWorkType
}

export interface CreateSocialVideoAnalysisInput {
  title: string
  publishedAt: string
  coverUrl?: string | null
  markdown: string
  publishStatus?: SocialVideoPublishStatus
  workType?: SocialVideoWorkType
}

export interface ListSocialVideoAnalysesOptions {
  /** 不传或空 = 全部；后端 eq 筛选 */
  publishStatus?: SocialVideoPublishStatus | '' | null
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

  const res = await fetch(`${config.url}/rest/v1/${path}`, {
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
  return DEFAULT_SOCIAL_VIDEO_PUBLISH_STATUS
}

function normalizeWorkType(value: unknown): SocialVideoWorkType {
  if (typeof value === 'string' && (SOCIAL_VIDEO_WORK_TYPES as readonly string[]).includes(value)) {
    return value as SocialVideoWorkType
  }
  return DEFAULT_SOCIAL_VIDEO_WORK_TYPE
}

function normalizeRecord(row: SocialVideoAnalysisRecord): SocialVideoAnalysisRecord {
  return {
    ...row,
    publish_status: normalizePublishStatus(row.publish_status),
    work_type: normalizeWorkType(row.work_type),
  }
}

export async function listSocialVideoAnalyses(
  options: ListSocialVideoAnalysesOptions = {},
  config = browserSupabaseConfig(),
): Promise<SocialVideoAnalysisRecord[]> {
  const params = new URLSearchParams()
  params.set(
    'select',
    'id,created_at,title,published_at,cover_url,publish_status,work_type',
  )
  params.set('order', 'created_at.desc')
  const status = options.publishStatus?.trim()
  if (status) {
    params.set('publish_status', `eq.${status}`)
  }

  const rows = await supabaseRest<SocialVideoAnalysisRecord[]>(
    config,
    `${ERA_SOCIAL_VIDEO_ANALYSES_TABLE}?${params.toString()}`,
    { method: 'GET' },
  )
  return rows.map(normalizeRecord)
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
