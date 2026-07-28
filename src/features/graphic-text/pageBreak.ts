/** 内部分页指令：仅用于排版，不应作为正文展示 */
export const ERA_PAGE_BREAK_MARKER = '<!-- era:page-break -->'

export function isPageBreakMarker(text: string): boolean {
  return text.trim() === ERA_PAGE_BREAK_MARKER
}

export function stripPageBreakMarkerLines(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== ERA_PAGE_BREAK_MARKER)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function prependPageBreakMarker(text: string): string {
  const body = stripPageBreakMarkerLines(text)
  return `${ERA_PAGE_BREAK_MARKER}\n${body}`
}
