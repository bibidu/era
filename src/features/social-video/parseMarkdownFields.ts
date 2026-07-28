const KNOWN_FIELD_HEADERS = new Set([
  '作品名称',
  '作品话题/标签(以 # 开头）',
  '作品话题/标签(以 # 开头)',
  '发布日期',
  '作品诊断？',
  '作品诊断?',
])

function isFieldHeader(line: string) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) {
    return true
  }
  if (KNOWN_FIELD_HEADERS.has(trimmed)) {
    return true
  }
  return /^[^:：]+[:：]/.test(trimmed)
}

export function extractMarkdownField(markdown: string, fieldName: string) {
  const inlinePattern = new RegExp(`^${escapeRegExp(fieldName)}\\s*[:：]\\s*(.+)$`, 'm')
  const inlineMatch = markdown.match(inlinePattern)
  if (inlineMatch?.[1]?.trim()) {
    return inlineMatch[1].trim()
  }

  const lines = markdown.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim()
    if (trimmed !== fieldName && !trimmed.startsWith(`${fieldName}(`) && !trimmed.startsWith(`${fieldName}（`)) {
      continue
    }

    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex].trim()
      if (!nextLine) {
        continue
      }
      if (isFieldHeader(nextLine)) {
        break
      }
      return nextLine
    }
  }

  return ''
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
