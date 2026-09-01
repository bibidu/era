export type CodeTokenKind =
  | 'comment'
  | 'keyword'
  | 'string'
  | 'number'
  | 'function'
  | 'identifier'
  | 'operator'
  | 'punct'
  | 'plain'

export type CodeToken = { text: string; kind: CodeTokenKind }

export const CODE_TOKEN_COLORS: Record<CodeTokenKind, string> = {
  comment: '#6A9955',
  keyword: '#C586C0',
  string: '#CE9178',
  number: '#B5CEA8',
  function: '#DCDCAA',
  identifier: '#9CDCFE',
  operator: '#D4D4D4',
  punct: '#808080',
  plain: '#D4D4D4',
}

export const GITHUB_CODE_FONT = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
export const GITHUB_NUMBER_FONT = '"Liberation Mono", Menlo, Consolas, ui-monospace, monospace'
export const CODE_TOKEN_FONTS: Record<CodeTokenKind, string> = {
  comment: GITHUB_CODE_FONT,
  keyword: GITHUB_CODE_FONT,
  string: GITHUB_CODE_FONT,
  number: GITHUB_NUMBER_FONT,
  function: GITHUB_CODE_FONT,
  identifier: GITHUB_CODE_FONT,
  operator: GITHUB_CODE_FONT,
  punct: GITHUB_CODE_FONT,
  plain: GITHUB_CODE_FONT,
}

const CJK_RE = /[\u4e00-\u9fff]/
const COMMENT_LEADER_RE = /^(?:\/\/|\/\*|\*|\#)/
const JS_KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'of',
  'in',
  'new',
  'class',
  'async',
  'await',
  'true',
  'false',
  'null',
  'undefined',
  'import',
  'export',
  'from',
  'default',
])
const OPERATOR_CHARS = new Set(['+', '-', '=', '>', '<', '!', '&', '|', '?', ':'])
const IDENT_START = /[A-Za-z_]/
const IDENT_PART = /[A-Za-z0-9_]/

function splitIndent(line: string): { indent: string; rest: string } {
  const match = line.match(/^(\s*)/)
  const indent = match?.[1] ?? ''
  return { indent, rest: line.slice(indent.length) }
}

export function prefixChineseCodeLine(line: string): string {
  if (!line) return line
  const { indent, rest } = splitIndent(line)
  if (!rest) return line
  if (COMMENT_LEADER_RE.test(rest)) return line
  if (!CJK_RE.test(rest)) return line
  return `${indent}// ${rest}`
}

export function prefixChineseCodeText(text: string): string {
  if (!text) return text
  return text.split('\n').map(prefixChineseCodeLine).join('\n')
}

function mergeTokens(tokens: CodeToken[]): CodeToken[] {
  const out: CodeToken[] = []
  for (const token of tokens) {
    if (!token.text) continue
    const last = out[out.length - 1]
    if (last && last.kind === token.kind) last.text += token.text
    else out.push({ text: token.text, kind: token.kind })
  }
  return out
}

function readQuoted(line: string, start: number): { text: string; end: number } {
  const quote = line[start]
  let i = start + 1
  while (i < line.length) {
    const ch = line[i]
    if (ch === '\\' && i + 1 < line.length) {
      i += 2
      continue
    }
    if (ch === quote) return { text: line.slice(start, i + 1), end: i + 1 }
    i += 1
  }
  return { text: line.slice(start), end: line.length }
}

function readNumber(line: string, start: number): { text: string; end: number } {
  if (line[start] === '0' && (line[start + 1] === 'x' || line[start + 1] === 'X')) {
    let i = start + 2
    while (i < line.length && /[0-9a-fA-F]/.test(line[i])) i += 1
    return { text: line.slice(start, i), end: i }
  }
  let i = start
  while (i < line.length && /\d/.test(line[i])) i += 1
  if (line[i] === '.' && /\d/.test(line[i + 1] ?? '')) {
    i += 1
    while (i < line.length && /\d/.test(line[i])) i += 1
  }
  if ((line[i] === 'e' || line[i] === 'E') && i + 1 < line.length) {
    let j = i + 1
    if (line[j] === '+' || line[j] === '-') j += 1
    if (/\d/.test(line[j] ?? '')) {
      i = j
      while (i < line.length && /\d/.test(line[i])) i += 1
    }
  }
  return { text: line.slice(start, i), end: i }
}

function readIdent(line: string, start: number): { text: string; end: number } {
  let i = start + 1
  while (i < line.length && IDENT_PART.test(line[i])) i += 1
  return { text: line.slice(start, i), end: i }
}

function tokenizeCommentTail(text: string): CodeToken[] {
  const tokens: CodeToken[] = []
  let i = 0
  while (i < text.length) {
    if (text.startsWith('//', i) || text.startsWith('/*', i) || text.startsWith('*/', i)) {
      tokens.push({ text: text.slice(i, i + 2), kind: 'comment' })
      i += 2
      continue
    }
    if (text[i] === '"' || text[i] === "'" || text[i] === '`') {
      const quoted = readQuoted(text, i)
      tokens.push({ text: quoted.text, kind: 'string' })
      i = quoted.end
      continue
    }
    if (/\d/.test(text[i])) {
      const num = readNumber(text, i)
      tokens.push({ text: num.text, kind: 'number' })
      i = num.end
      continue
    }
    if (IDENT_START.test(text[i])) {
      const ident = readIdent(text, i)
      tokens.push({ text: ident.text, kind: 'identifier' })
      i = ident.end
      continue
    }
    if (text[i] === '.') {
      tokens.push({ text: '.', kind: 'punct' })
      i += 1
      continue
    }
    let j = i + 1
    while (
      j < text.length &&
      !text.startsWith('//', j) &&
      !text.startsWith('/*', j) &&
      !text.startsWith('*/', j) &&
      text[j] !== '"' &&
      text[j] !== "'" &&
      text[j] !== '`' &&
      text[j] !== '.' &&
      !/\d/.test(text[j]) &&
      !IDENT_START.test(text[j])
    ) {
      j += 1
    }
    tokens.push({ text: text.slice(i, j), kind: 'comment' })
    i = j
  }
  return tokens
}

function peekNonSpace(line: string, start: number): string {
  let i = start
  while (i < line.length && /\s/.test(line[i])) i += 1
  return line[i] ?? ''
}

export function tokenizeJavaScript(line: string): CodeToken[] {
  if (!line) return []
  const { indent, rest } = splitIndent(line)
  const tokens: CodeToken[] = []
  if (indent) tokens.push({ text: indent, kind: 'plain' })
  if (!rest) return mergeTokens(tokens)

  if (COMMENT_LEADER_RE.test(rest)) {
    tokens.push(...tokenizeCommentTail(rest))
    return mergeTokens(tokens)
  }

  let i = 0
  while (i < rest.length) {
    const ch = rest[i]
    if (/\s/.test(ch)) {
      let j = i + 1
      while (j < rest.length && /\s/.test(rest[j])) j += 1
      tokens.push({ text: rest.slice(i, j), kind: 'plain' })
      i = j
      continue
    }
    if (rest.startsWith('//', i)) {
      tokens.push(...tokenizeCommentTail(rest.slice(i)))
      break
    }
    if (rest.startsWith('/*', i)) {
      const end = rest.indexOf('*/', i + 2)
      const close = end >= 0 ? end + 2 : rest.length
      tokens.push(...tokenizeCommentTail(rest.slice(i, close)))
      i = close
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quoted = readQuoted(rest, i)
      tokens.push({ text: quoted.text, kind: 'string' })
      i = quoted.end
      continue
    }
    if (/\d/.test(ch)) {
      const num = readNumber(rest, i)
      tokens.push({ text: num.text, kind: 'number' })
      i = num.end
      continue
    }
    if (IDENT_START.test(ch)) {
      const ident = readIdent(rest, i)
      if (JS_KEYWORDS.has(ident.text)) {
        tokens.push({ text: ident.text, kind: 'keyword' })
      } else if (peekNonSpace(rest, ident.end) === '(') {
        tokens.push({ text: ident.text, kind: 'function' })
      } else {
        tokens.push({ text: ident.text, kind: 'identifier' })
      }
      i = ident.end
      continue
    }
    if (OPERATOR_CHARS.has(ch)) {
      let j = i + 1
      while (j < rest.length && OPERATOR_CHARS.has(rest[j])) j += 1
      tokens.push({ text: rest.slice(i, j), kind: 'operator' })
      i = j
      continue
    }
    tokens.push({ text: ch, kind: 'punct' })
    i += 1
  }

  return mergeTokens(tokens)
}
