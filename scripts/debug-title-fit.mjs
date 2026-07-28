import { readFileSync } from 'node:fs'
import { encodeGlyphEmphasis } from '../src/features/graphic-text/glyphEmphasis.ts'

const AGENT = 'http://127.0.0.1:3847'

async function api(method, path, body) {
  const res = await fetch(`${AGENT}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }
  return { ok: res.ok, status: res.status, data }
}

const snap = JSON.parse(readFileSync('public/gallery/2026-07-28/era-project.json', 'utf8'))
const md = snap.document.blocks
  .filter((b) => b.kind === 'markdown')
  .map((b) => b.text)
  .join('\n\n')

const created = await api('POST', '/v1/projects', {
  markdown: md,
  title: '买房租房选楼层|99%的人都选错了|「上篇」',
  config: {
    pageOverlay: 'fengshui',
    aspectRatio: '9:16',
    showWordCount: false,
    topText: snap.config.topText,
  },
})
const projectId = created.data.id || created.data.projectId || created.data.project?.id
console.log('project', projectId, created.status)

const proj = await api('GET', `/v1/projects/${projectId}`)
const titleId = (proj.data.blocks || []).find((b) => b.type === 'title')?.id
console.log('titleId', titleId)

const ta = snap.meta.titleAdjust
const glyphEmphasis = {}
let idx = 0
for (const line of ta.lines) {
  for (const char of line.chars) {
    glyphEmphasis[`${titleId}:${idx}`] = encodeGlyphEmphasis({
      fontFamily: char.fontFamily,
      scaleX: char.scaleX,
      scaleY: char.scaleY,
      fontSize: char.fontSize,
      widthEm: char.widthEm,
      color: char.color,
    })
    idx += 1
  }
}

const colorHighlightColors = {}
idx = 0
for (const line of ta.lines) {
  for (const char of line.chars) {
    if (char.color && char.color.toLowerCase() !== '#111111') {
      colorHighlightColors[`${titleId}:${idx}`] = char.color
    }
    idx += 1
  }
}

await api('PATCH', `/v1/projects/${projectId}/config`, {
  patch: {
    pageOverlay: 'fengshui',
    aspectRatio: '9:16',
    showWordCount: false,
    topText: snap.config.topText,
    glyphEmphasis,
    colorHighlightColors,
    titleLineGapEm: ta.lineGapEm,
    brushHighlightColors: snap.config.brushHighlightColors,
  },
})

const exp = await api('POST', `/v1/projects/${projectId}/export`, {
  outDir: '/tmp/era-title-debug',
})
console.log('export', exp.status, JSON.stringify(exp.data).slice(0, 1500))
