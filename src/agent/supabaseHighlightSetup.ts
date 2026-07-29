/** Supabase 存放高亮设置草稿（公开 anon key + RLS；勿提交 service_role） */

export const DEFAULT_SUPABASE_URL = 'https://kzoxyextxjwscrpjowud.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b3h5ZXh0eGp3c2NycGpvd3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMDM4MjYsImV4cCI6MjEwMDY3OTgyNn0.FZuvFtxaMOUUGg3y7kNDxv_p4Etz2KrVpkCHpPKbmDU'

export const ERA_HIGHLIGHT_SETUP_TABLE = 'era_highlight_setups'
export const ERA_PUBLIC_BASE = 'https://bibidu-era-0tdhv043.edgeone.cool/'
/** @deprecated 使用 ERA_PUBLIC_BASE；保留别名兼容旧引用 */
export const ERA_GITHUB_PAGES_BASE = ERA_PUBLIC_BASE

export interface HighlightSetupShareRecord {
  id: string
  created_at?: string
  updated_at?: string
  project_id?: string | null
  title: string
  markdown: string
  document?: unknown
  config: Record<string, unknown>
  result_ranges?: unknown
  result_clipboard?: string | null
  expires_at?: string
}

export interface CreateHighlightSetupShareInput {
  projectId?: string
  title?: string
  markdown: string
  document?: unknown
  config?: Record<string, unknown>
}

function trimSlash(url: string) {
  return url.replace(/\/$/, '')
}

export function resolveSupabaseConfig(env: {
  url?: string
  anonKey?: string
} = {}) {
  const url = trimSlash(env.url || DEFAULT_SUPABASE_URL)
  const anonKey = env.anonKey || DEFAULT_SUPABASE_ANON_KEY
  return { url, anonKey }
}

function readViteEnv(): Record<string, string | undefined> {
  try {
    return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {}
  } catch {
    return {}
  }
}

/** 浏览器侧：优先读 Vite 环境变量 */
export function browserSupabaseConfig() {
  const env = readViteEnv()
  return resolveSupabaseConfig({
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
  })
}

/** Node / Agent 侧 */
export function serverSupabaseConfig() {
  const maybeProcess = (globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> }
  }).process
  const env = maybeProcess?.env ?? {}
  return resolveSupabaseConfig({
    url: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY,
  })
}

export function defaultSupabaseConfig() {
  return typeof window === 'undefined' ? serverSupabaseConfig() : browserSupabaseConfig()
}

export function highlightSetupPagesUrl(shareId: string, pagesBase = ERA_GITHUB_PAGES_BASE) {
  const base = pagesBase.endsWith('/') ? pagesBase : `${pagesBase}/`
  const url = new URL(base)
  url.searchParams.set('highlightSetup', '1')
  url.searchParams.set('shareId', shareId)
  return url.toString()
}

function shareDocumentForStorage(document?: unknown): unknown | null {
  if (!document || typeof document !== 'object') return null
  const blocks = (document as { blocks?: { kind?: string; text?: string }[] }).blocks
  const hasContent = blocks?.some(
    (block) => block.kind === 'markdown' && String(block.text ?? '').trim().length > 0,
  )
  return hasContent ? document : null
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

export async function createHighlightSetupShare(
  input: CreateHighlightSetupShareInput,
  config = defaultSupabaseConfig(),
): Promise<{ shareId: string; url: string; record: HighlightSetupShareRecord }> {
  const rows = await supabaseRest<HighlightSetupShareRecord[]>(
    config,
    ERA_HIGHLIGHT_SETUP_TABLE,
    {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        project_id: input.projectId ?? null,
        title: input.title ?? '',
        markdown: input.markdown,
        document: shareDocumentForStorage(input.document),
        config: input.config ?? {},
      }),
    },
  )
  const record = rows[0]
  if (!record?.id) throw new Error('创建高亮设置分享失败：无返回 id')
  return {
    shareId: record.id,
    url: highlightSetupPagesUrl(record.id),
    record,
  }
}

export async function fetchHighlightSetupShare(
  shareId: string,
  config = defaultSupabaseConfig(),
): Promise<HighlightSetupShareRecord> {
  const rows = await supabaseRest<HighlightSetupShareRecord[]>(
    config,
    `${ERA_HIGHLIGHT_SETUP_TABLE}?id=eq.${encodeURIComponent(shareId)}&select=*`,
    { method: 'GET' },
  )
  const record = rows[0]
  if (!record) throw new Error('分享不存在或已过期')
  return record
}

export async function saveHighlightSetupResult(
  shareId: string,
  payload: {
    resultRanges: unknown
    resultClipboard: string
  },
  config = defaultSupabaseConfig(),
): Promise<HighlightSetupShareRecord> {
  const rows = await supabaseRest<HighlightSetupShareRecord[]>(
    config,
    `${ERA_HIGHLIGHT_SETUP_TABLE}?id=eq.${encodeURIComponent(shareId)}`,
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify({
        result_ranges: payload.resultRanges,
        result_clipboard: payload.resultClipboard,
        updated_at: new Date().toISOString(),
      }),
    },
  )
  const record = rows[0]
  if (!record) throw new Error('写回高亮结果失败')
  return record
}

/* -------------------------------------------------------------------------- */
/* 导出图分享：把最终导出的各页 PNG + 拼图存到 Supabase，返回 GitHub Pages 预览/下载页 */
/* -------------------------------------------------------------------------- */

export const ERA_EXPORT_SHARE_TABLE = 'era_export_shares'

export interface ExportShareImage {
  /** 文件名，如 graphic-page-01.png / graphic-review-sheet.png */
  name: string
  /** 完整 dataURL（data:image/png;base64,...） */
  dataUrl: string
}

export interface ExportShareRecord {
  id: string
  created_at?: string
  project_id?: string | null
  title: string
  aspect_ratio?: string | null
  images: ExportShareImage[]
  sheet?: ExportShareImage | null
  expires_at?: string
}

export interface CreateExportShareInput {
  projectId?: string
  title?: string
  aspectRatio?: string
  images: ExportShareImage[]
  sheet?: ExportShareImage | null
}

export function exportSharePagesUrl(shareId: string, pagesBase = ERA_GITHUB_PAGES_BASE) {
  const base = pagesBase.endsWith('/') ? pagesBase : `${pagesBase}/`
  const url = new URL('gallery/', base)
  url.searchParams.set('shareId', shareId)
  return url.toString()
}

export async function createExportShare(
  input: CreateExportShareInput,
  config = defaultSupabaseConfig(),
): Promise<{ shareId: string; url: string; record: ExportShareRecord }> {
  if (!input.images?.length) throw new Error('创建导出图分享失败：images 为空')
  // 图片体积大：显式生成 id + return=minimal，避免把整行 base64 回显导致网关超时
  const id =
    (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const record: ExportShareRecord = {
    id,
    project_id: input.projectId ?? null,
    title: input.title ?? '',
    aspect_ratio: input.aspectRatio ?? null,
    images: input.images,
    sheet: input.sheet ?? null,
  }
  await supabaseRest<void>(config, ERA_EXPORT_SHARE_TABLE, {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify(record),
  })
  return {
    shareId: id,
    url: exportSharePagesUrl(id),
    record,
  }
}

export async function fetchExportShare(
  shareId: string,
  config = defaultSupabaseConfig(),
): Promise<ExportShareRecord> {
  const rows = await supabaseRest<ExportShareRecord[]>(
    config,
    `${ERA_EXPORT_SHARE_TABLE}?id=eq.${encodeURIComponent(shareId)}&select=*`,
    { method: 'GET' },
  )
  const record = rows[0]
  if (!record) throw new Error('分享不存在或已过期')
  return record
}
