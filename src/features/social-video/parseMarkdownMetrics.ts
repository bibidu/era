import { extractMarkdownField } from './parseMarkdownFields'

export interface MetricPoint {
  label: string
  value: number
  raw: string
}

export interface MetricSection {
  id: string
  title: string
  content: string
  points: MetricPoint[]
}

const SECTION_ORDER = ['总览', '流量', '粉丝', '观众参与度', '流量来源', '观众数据', '观众偏好', '观众画像'] as const

const CHART_FIELDS: Record<string, string[]> = {
  流量: ['播放量', '点赞量', '评论量', '分享量', '收藏量'],
  粉丝: ['涨粉量', '脱粉量'],
  观众参与度: ['点赞率', '评论率', '收藏率', '分享率'],
  流量来源: ['推荐页', '个人主页', '朋友页', '搜索', '消息页', '其他', '平台扶持流量'],
  观众数据: ['吸粉量', '脱粉量', '不感兴趣量'],
}

function parseNumeric(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned || cleaned === '-' || cleaned === '—') return null
  const percent = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*%/)
  if (percent) return Number(percent[1])
  const numberMatch = cleaned.match(/-?\d+(?:\.\d+)?/)
  if (!numberMatch) return null
  return Number(numberMatch[0])
}

/** 将 markdown 按 #标题 切成段落 */
export function parseMetricSections(markdown: string): MetricSection[] {
  const text = markdown.trim()
  if (!text) return []

  const parts = text.split(/^#\s*/m).filter((part) => part.trim())
  const sections: MetricSection[] = []

  for (const part of parts) {
    const lines = part.split('\n')
    const title = (lines[0] || '').trim()
    if (!title) continue
    const body = lines.slice(1).join('\n').trim()
    const fieldNames = CHART_FIELDS[title] || []
    const points: MetricPoint[] = []
    for (const field of fieldNames) {
      const raw = extractMarkdownField(part, field)
      const value = parseNumeric(raw)
      if (value === null) continue
      points.push({ label: field.replace(/量$/, '').replace(/率$/, ''), value, raw })
    }
    sections.push({
      id: title,
      title,
      content: body,
      points,
    })
  }

  sections.sort((left, right) => {
    const leftIndex = SECTION_ORDER.indexOf(left.title as (typeof SECTION_ORDER)[number])
    const rightIndex = SECTION_ORDER.indexOf(right.title as (typeof SECTION_ORDER)[number])
    const safeLeft = leftIndex === -1 ? 999 : leftIndex
    const safeRight = rightIndex === -1 ? 999 : rightIndex
    return safeLeft - safeRight
  })

  return sections
}

export function extractWorkSummary(markdown: string, titleFallback = '') {
  const diagnosis =
    extractMarkdownField(markdown, '作品诊断？') ||
    extractMarkdownField(markdown, '作品诊断?') ||
    extractMarkdownField(markdown, '作品诊断')
  const name = extractMarkdownField(markdown, '作品名称') || titleFallback
  return { title: name || titleFallback || '未命名作品', summary: diagnosis || '' }
}

export function extractPrimaryChartPoints(markdown: string): MetricPoint[] {
  const sections = parseMetricSections(markdown)
  const traffic = sections.find((section) => section.title === '流量')
  if (traffic?.points.length) return traffic.points
  for (const section of sections) {
    if (section.points.length) return section.points
  }
  return []
}

export function truncateText(value: string, max = 72) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max)}…`
}

export interface MarkdownImageRef {
  alt: string
  src: string
}

/** 从 markdown 提取图片；可选附带封面（去重） */
export function extractMarkdownImages(markdown: string, coverUrl?: string | null): MarkdownImageRef[] {
  const images: MarkdownImageRef[] = []
  const seen = new Set<string>()

  const push = (src: string, alt = '') => {
    const normalized = src.trim()
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    images.push({ src: normalized, alt })
  }

  if (coverUrl) push(coverUrl, '封面')

  const pattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(markdown)) !== null) {
    push(match[2], match[1] || '')
  }

  return images
}

