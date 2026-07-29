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

/** 兼容 `#标题`（无空格）这类常见写法，转为标准 ATX 标题；
 * 并去掉 Obsidian/Typora 的图片尺寸后缀：`![alt](url =860x312)` */
export function normalizeMarkdownSource(source: string) {
  return source
    .replace(/\r\n/g, '\n')
    .replace(/^(#{1,6})(?!#)(\S)/gm, '$1 $2')
    .replace(/(!\[[^\]]*]\()(\S+?)(\s+=\s*\d+(?:x\d+)?)(\))/g, '$1$2$4')
}

/** 将 Markdown 渲染为 HTML（标题 / 图片 / 代码块等） */
export function MarkdownPreview({ value, className = '' }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    const source = value.trim()
    if (!source) return '<p class="md-empty">暂无内容</p>'
    const normalized = normalizeMarkdownSource(source)
    return marked.parse(normalized, { async: false }) as string
  }, [value])

  return (
    <div
      className={`era-md-preview ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
