import { browserSupabaseConfig, resolveSupabaseConfig } from './supabaseHighlightSetup'

export const ERA_SOCIAL_VIDEO_ANALYSES_TABLE = 'era_social_video_analyses'

export interface SocialVideoAnalysisRecord {
  id: string
  created_at: string
  title: string
  published_at: string
  cover_url: string | null
  markdown?: string
}

export interface CreateSocialVideoAnalysisInput {
  title: string
  publishedAt: string
  coverUrl?: string | null
  markdown: string
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

export async function listSocialVideoAnalyses(
  config = browserSupabaseConfig(),
): Promise<SocialVideoAnalysisRecord[]> {
  return supabaseRest<SocialVideoAnalysisRecord[]>(
    config,
    `${ERA_SOCIAL_VIDEO_ANALYSES_TABLE}?select=id,created_at,title,published_at,cover_url&order=created_at.desc`,
    { method: 'GET' },
  )
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
  return record
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
      }),
    },
  )
  const record = rows[0]
  if (!record?.id) {
    throw new Error('保存失败：Supabase 未返回记录 id')
  }
  return record
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
