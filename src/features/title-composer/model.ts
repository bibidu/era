import { TITLE_ACCENT, TITLE_INK, type TitleChar, type TitleDocument, type TitleLine } from './types'

let seq = 0
export function nextId(prefix: string) {
  seq += 1
  return `${prefix}-${seq}-${Math.random().toString(36).slice(2, 7)}`
}

export function charsFromText(text: string, accentIndexes?: number[]): TitleChar[] {
  const accent = new Set(accentIndexes ?? [])
  return Array.from(text).map((ch, index) => ({
    id: nextId('c'),
    ch,
    color: accent.has(index) ? TITLE_ACCENT : undefined,
  }))
}

export function lineText(line: TitleLine): string {
  return line.chars.map((c) => c.ch).join('')
}

export function documentPlainText(doc: TitleDocument): string {
  return doc.lines.map(lineText).join('\n')
}

export function createLine(
  text: string,
  partial: Partial<Omit<TitleLine, 'id' | 'chars'>> & { accentIndexes?: number[] } = {},
): TitleLine {
  const { accentIndexes, ...rest } = partial
  return {
    id: nextId('line'),
    chars: charsFromText(text, accentIndexes),
    fontSize: 40,
    stretch: 1,
    fontId: 'shuheiti',
    color: TITLE_INK,
    gapAfter: 12,
    ...rest,
  }
}

/** 示例：西北绝不能做厨房 / 火烧天门 / 是八宅最大禁忌 */
export function createDemoDocument(): TitleDocument {
  return {
    lines: [
      createLine('西北绝不能做厨房，', {
        fontSize: 40,
        stretch: 1,
        fontId: 'shuheiti',
        color: TITLE_INK,
        gapAfter: 10,
        // 「绝」
        accentIndexes: [2],
      }),
      createLine('火烧天门', {
        fontSize: 88,
        stretch: 1.35,
        fontId: 'shuheiti',
        color: TITLE_ACCENT,
        gapAfter: 14,
      }),
      createLine('是八宅最大禁忌', {
        fontSize: 40,
        stretch: 1,
        fontId: 'shuheiti',
        color: TITLE_INK,
        gapAfter: 0,
      }),
    ],
  }
}

/** 在全局字符索引处断行（index 为断点前已有字符数） */
export function splitAtGlobalIndex(doc: TitleDocument, globalIndex: number): TitleDocument {
  let offset = 0
  for (let lineIndex = 0; lineIndex < doc.lines.length; lineIndex++) {
    const line = doc.lines[lineIndex]
    const len = line.chars.length
    if (globalIndex > offset && globalIndex < offset + len) {
      const local = globalIndex - offset
      const left: TitleLine = {
        ...line,
        id: nextId('line'),
        chars: line.chars.slice(0, local),
        gapAfter: 10,
      }
      const right: TitleLine = {
        ...line,
        id: nextId('line'),
        chars: line.chars.slice(local),
      }
      const lines = [...doc.lines.slice(0, lineIndex), left, right, ...doc.lines.slice(lineIndex + 1)]
      return { lines }
    }
    offset += len
  }
  return doc
}

/** 合并 lineIndex 与下一行 */
export function mergeWithNext(doc: TitleDocument, lineIndex: number): TitleDocument {
  if (lineIndex < 0 || lineIndex >= doc.lines.length - 1) return doc
  const a = doc.lines[lineIndex]
  const b = doc.lines[lineIndex + 1]
  const merged: TitleLine = {
    ...a,
    id: nextId('line'),
    chars: [...a.chars, ...b.chars],
    gapAfter: b.gapAfter,
  }
  const lines = [...doc.lines.slice(0, lineIndex), merged, ...doc.lines.slice(lineIndex + 2)]
  return { lines }
}

export function updateLine(
  doc: TitleDocument,
  lineId: string,
  patch: Partial<Omit<TitleLine, 'id' | 'chars'>>,
): TitleDocument {
  return {
    lines: doc.lines.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
  }
}

export function toggleCharColor(
  doc: TitleDocument,
  lineId: string,
  charId: string,
  accent: string,
): TitleDocument {
  return {
    lines: doc.lines.map((line) => {
      if (line.id !== lineId) return line
      return {
        ...line,
        chars: line.chars.map((c) => {
          if (c.id !== charId) return c
          if (c.color === accent) return { ...c, color: undefined }
          return { ...c, color: accent }
        }),
      }
    }),
  }
}

export function applyLineColor(doc: TitleDocument, lineId: string, color: string): TitleDocument {
  return {
    lines: doc.lines.map((line) => {
      if (line.id !== lineId) return line
      return {
        ...line,
        color,
        chars: line.chars.map((c) => ({ ...c, color: undefined })),
      }
    }),
  }
}

/** 用纯文本（含换行）重建文档，尽量保留已有行样式 */
export function rebuildFromPlainText(doc: TitleDocument, plain: string): TitleDocument {
  const parts = plain.replace(/\r\n/g, '\n').split('\n')
  const lines = parts.map((text, index) => {
    const prev = doc.lines[index]
    if (prev && lineText(prev) === text) return prev
    if (prev) {
      return {
        ...prev,
        id: nextId('line'),
        chars: charsFromText(text),
      }
    }
    return createLine(text || ' ', {
      fontSize: index === 1 ? 72 : 40,
      gapAfter: index === parts.length - 1 ? 0 : 12,
    })
  })
  return { lines: lines.length ? lines : [createLine('')] }
}
