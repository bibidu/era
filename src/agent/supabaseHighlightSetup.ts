/** Supabase 存放高亮设置草稿（公开 anon key + RLS；勿提交 service_role） */

export const DEFAULT_SUPABASE_URL = 'https://kzoxyextxjwscrpjowud.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b3h5ZXh0eGp3c2NycGpvd3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMDM4MjYsImV4cCI6MjEwMDY3OTgyNn0.FZuvFtxaMOUUGg3y7kNDxv_p4Etz2KrVpkCHpPKbmDU'

export const ERA_HIGHLIGHT_SETUP_TABLE = 'era_highlight_setups'
export const ERA_PUBLIC_BASE = 'https://bibidu-era-0tdhv043.edgeone.cool/'

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

function readProcessEnv(): Record<string, string | undefined> {
  const maybeProcess = (globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> }
  }).process
  return maybeProcess?.env ?? {}
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
  const env = readProcessEnv()
  return resolveSupabaseConfig({
    url: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY,
  })
}

export function defaultSupabaseConfig() {
  return typeof window === 'undefined' ? serverSupabaseConfig() : browserSupabaseConfig()
}

/**
 * 公网页基址：优先环境变量里的完整 EdgeOne 预览链（可含 eo_token/eo_time），否则默认裸域名。
 * 注意：token 约 3 小时过期；Agent 发链时应传入最新部署 URL。
 */
export function resolvePublicPagesBase(
  override?: string,
  env: Record<string, string | undefined> = {
    ...readProcessEnv(),
    ...readViteEnv(),
  },
): string {
  const fromEnv =
    override?.trim() ||
    env.ERA_PUBLIC_BASE?.trim() ||
    env.EDGEONE_PREVIEW_URL?.trim() ||
    env.VITE_ERA_PUBLIC_BASE?.trim() ||
    ''
  return fromEnv || ERA_PUBLIC_BASE
}

/**
 * 判断 search / URLSearchParams 是否为「整段 query 被二次编码」形态：
 * `?eo_token%3D…%26eo_time%3D…%26tab%3Dhighlight%26shareId%3D…`
 * 此时 URLSearchParams 只会得到一个 key（含 `=`/`&`）且 value 为空，
 * `tab` / `shareId` 都会读成 null → 前端落回默认社媒 Tab 并提示缺少 shareId。
 */
export function isDoubleEncodedSearchParams(params: URLSearchParams): boolean {
  const entries = [...params.entries()]
  if (entries.length !== 1) return false
  const [key, value] = entries[0]!
  return (
    value === '' &&
    /[=&]/.test(key) &&
    (/%3D|%26/i.test(params.toString()) || key.includes('='))
  )
}

/** 从 location.search / 裸 query 解析参数；若整段被二次编码则先还原 */
export function parsePreviewSearchParams(search: string): URLSearchParams {
  const raw = search.startsWith('?') ? search.slice(1) : search
  if (!raw) return new URLSearchParams()
  const params = new URLSearchParams(raw)
  if (!isDoubleEncodedSearchParams(params)) return params
  const [key] = [...params.entries()][0]!
  return new URLSearchParams(key)
}

/**
 * 规范化预览 URL：
 * - 修复「整段 query 被 encodeURIComponent」→ `?eo_token%3D…%26eo_time%3D…`（EdgeOne Error -100）
 * - 不在已有 query 末尾错误追加 `/`（会污染 eo_time）
 */
export function normalizePreviewUrl(raw: string): string {
  const input = raw.trim()
  if (!input) return input

  let url: URL
  try {
    url = new URL(input)
  } catch {
    return input
  }

  if (!url.pathname) url.pathname = '/'

  if (isDoubleEncodedSearchParams(url.searchParams)) {
    const recovered = parsePreviewSearchParams(url.search)
    url.search = ''
    for (const [key, value] of recovered.entries()) {
      url.searchParams.append(key, value)
    }
  }

  return url.toString()
}

/**
 * 浏览器启动时：若地址栏 query 被整段二次编码，立即 replaceState 还原。
 * 必须在首次读 tab/shareId 之前调用，否则会落回社媒 Tab 且丢失 shareId。
 * @returns 是否改写了地址栏
 */
export function recoverPreviewUrlInBrowser(
  href: string = typeof window !== 'undefined' ? window.location.href : '',
): boolean {
  if (typeof window === 'undefined' || !href) return false
  let current: URL
  try {
    current = new URL(href)
  } catch {
    return false
  }
  if (!isDoubleEncodedSearchParams(current.searchParams)) return false

  const recovered = new URL(normalizePreviewUrl(href))
  const next = `${recovered.pathname}${recovered.search}${recovered.hash || current.hash}`
  const prev = `${current.pathname}${current.search}${current.hash}`
  if (next === prev) return false
  window.history.replaceState(window.history.state, '', next)
  return true
}

/** 在预览基址上合并 tab 等参数；保留已有 eo_token/eo_time，绝不二次编码整段 query */
export function buildAppPagesUrl(
  pagesBase: string,
  params: Record<string, string | null | undefined>,
): string {
  const url = new URL(normalizePreviewUrl(pagesBase || ERA_PUBLIC_BASE))
  if (!url.pathname) url.pathname = '/'
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue
    url.searchParams.set(key, value)
  }
  return url.toString()
}

export function highlightSetupPagesUrl(
  shareId: string,
  pagesBase: string = resolvePublicPagesBase(),
) {
  return buildAppPagesUrl(pagesBase, {
    tab: 'highlight',
    shareId,
  })
}

/**
 * 标题排版设置页 URL：必须带上当前帖子标题（?text=），避免打开固定 demo「西北绝不能…」。
 * 多行标题可用换行；调用方应传入完整 EdgeOne 预览链（含 eo_token/eo_time）作为 pagesBase。
 */
export function titleComposerPagesUrl(
  titleText: string,
  pagesBase: string = resolvePublicPagesBase(),
) {
  const text = titleText.replace(/\r\n/g, '\n').trim()
  return buildAppPagesUrl(pagesBase, {
    tab: 'title',
    text: text || undefined,
  })
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

/** Gallery 已下线；保留函数供旧调用方，返回空字符串 */
export function exportSharePagesUrl(shareId: string, _pagesBase = ERA_PUBLIC_BASE) {
  void shareId
  void _pagesBase
  return ''
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
