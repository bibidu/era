import { marked } from 'marked'
import { useMemo } from 'react'

marked.setOptions({
  gfm: true,
  breaks: true,
})

interface MarkdownPreviewProps {
  value: string
  className?: string
}

/** 将 Markdown 渲染为 HTML（标题 / 图片 / 代码块等） */
export function MarkdownPreview({ value, className = '' }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    const source = value.trim()
    if (!source) return '<p class="md-empty">暂无内容</p>'
    return marked.parse(source, { async: false }) as string
  }, [value])

  return (
    <div
      className={`era-md-preview ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
