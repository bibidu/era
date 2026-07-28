#!/usr/bin/env node
/**
 * 按 ERA_TITLE_ADJUST_V1 恢复楼层上篇工程并应用标题配置、导出。
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { encodeGlyphEmphasis } from '../src/features/graphic-text/glyphEmphasis.ts'

const AGENT = process.env.ERA_AGENT_URL || 'http://127.0.0.1:3847'
const OUT = '/tmp/era-title-adjust-export'
const GALLERY = join(
  process.cwd(),
  'public/gallery',
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }),
)

const titleAdjust = {
  type: 'era_title_adjust',
  version: 1,
  lineGapEm: 0.28,
  baseWidth: 360,
  lines: [
    {
      chars: [
        { ch: '买', fontId: 'shuheiti', fontFamily: '"Alimama ShuHeiTi", sans-serif', fontSize: 56, scaleX: 0.88, scaleY: 1.36, widthEm: 0.82, color: '#111111' },
        { ch: '房', fontId: 'shuheiti', fontFamily: '"Alimama ShuHeiTi", sans-serif', fontSize: 56, scaleX: 0.88, scaleY: 1.36, widthEm: 0.82, color: '#111111' },
        { ch: '租', fontId: 'shuheiti', fontFamily: '"Alimama ShuHeiTi", sans-serif', fontSize: 56, scaleX: 0.88, scaleY: 1.36, widthEm: 0.82, color: '#111111' },
        { ch: '房', fontId: 'shuheiti', fontFamily: '"Alimama ShuHeiTi", sans-serif', fontSize: 56, scaleX: 0.88, scaleY: 1.36, widthEm: 0.82, color: '#111111' },
        { ch: '选', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 51, scaleX: 1, scaleY: 1, widthEm: 1, color: '#b51a00' },
        { ch: '楼', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 51, scaleX: 1, scaleY: 1, widthEm: 1, color: '#b51a00' },
        { ch: '层', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 51, scaleX: 1, scaleY: 1, widthEm: 1, color: '#b51a00' },
      ],
    },
    {
      chars: [
        { ch: '9', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 44, scaleX: 1, scaleY: 1, widthEm: 0.56, color: '#111111' },
        { ch: '9', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 44, scaleX: 1, scaleY: 1, widthEm: 0.56, color: '#111111' },
        { ch: '%', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 44, scaleX: 1, scaleY: 1, widthEm: 0.9, color: '#111111' },
        { ch: '的', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 44, scaleX: 1, scaleY: 1, widthEm: 0.88, color: '#111111' },
        { ch: '人', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 44, scaleX: 1, scaleY: 1, widthEm: 0.88, color: '#111111' },
        { ch: '都', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 44, scaleX: 1, scaleY: 1, widthEm: 0.88, color: '#111111' },
        { ch: '选', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 44, scaleX: 1, scaleY: 1, widthEm: 0.88, color: '#111111' },
        { ch: '错', fontId: 'shuheiti', fontFamily: '"Alimama ShuHeiTi", sans-serif', fontSize: 56, scaleX: 0.88, scaleY: 1.36, widthEm: 0.82, color: '#b51a00' },
        { ch: '了', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 44, scaleX: 1, scaleY: 1, widthEm: 0.88, color: '#111111' },
      ],
    },
    {
      chars: [
        { ch: '「', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 56, scaleX: 1, scaleY: 1, widthEm: 1, color: '#111111' },
        { ch: '上', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 56, scaleX: 1, scaleY: 1, widthEm: 1, color: '#111111' },
        { ch: '篇', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 56, scaleX: 1, scaleY: 1, widthEm: 1, color: '#111111' },
        { ch: '」', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 56, scaleX: 1, scaleY: 1, widthEm: 1, color: '#111111' },
      ],
    },
  ],
}

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
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`)
  }
  return data
}

function titleAdjustToPatch(titleBlockId) {
  const glyphEmphasis = {}
  const colorHighlightColors = {}
  let index = 0
  const titleLines = []
  for (const line of titleAdjust.lines) {
    titleLines.push(line.chars.map((c) => c.ch).join(''))
    for (const char of line.chars) {
      const key = `${titleBlockId}:${index}`
      glyphEmphasis[key] = encodeGlyphEmphasis({
        fontFamily: char.fontFamily,
        scaleX: char.scaleX,
        scaleY: char.scaleY,
        fontSize: char.fontSize,
        widthEm: char.widthEm,
        color: char.color,
      })
      if (char.color && char.color.toLowerCase() !== '#111111') {
        colorHighlightColors[key] = char.color
      }
      index += 1
    }
  }
  return {
    title: titleLines.join('|'),
    glyphEmphasis,
    colorHighlightColors,
    titleLineGapEm: titleAdjust.lineGapEm,
  }
}

function remapHighlightMap(map, idMap) {
  const next = {}
  for (const [key, value] of Object.entries(map || {})) {
    const lastColon = key.lastIndexOf(':')
    if (lastColon <= 0) continue
    const oldBlockId = key.slice(0, lastColon)
    const index = key.slice(lastColon + 1)
    // content UUID is the prefix before ::
    const contentId = oldBlockId.split('::')[0]
    const newContentId = idMap[contentId] || idMap[oldBlockId]
    if (!newContentId) continue
    const suffix = oldBlockId.includes('::') ? oldBlockId.slice(oldBlockId.indexOf('::')) : ''
    const newBlockId = `${newContentId}${suffix}`
    next[`${newBlockId}:${index}`] = value
  }
  return next
}

async function main() {
  const snap = JSON.parse(
    readFileSync('public/gallery/2026-07-28/era-project.json', 'utf8'),
  )
  const markdown = snap.document.blocks
    .filter((b) => b.kind === 'markdown')
    .map((b) => b.text)
    .join('\n\n')

  const created = await api('POST', '/v1/projects', {
    markdown,
    title: '买房租房选楼层|99%的人都选错了|「上篇」',
    config: {
      pageOverlay: 'fengshui',
      aspectRatio: '9:16',
      showWordCount: false,
      topText: snap.config.topText,
      titleFontId: 'song',
      titleFontFamily: '"Noto Serif SC", serif',
      headingFontId: 'song',
      headingFontFamily: '"Noto Serif SC", serif',
      bodyFontId: 'song',
      bodyFontFamily: '"Noto Serif SC", serif',
    },
  })
  const projectId = created.id || created.projectId || created.project?.id
  if (!projectId) throw new Error(`no project id: ${JSON.stringify(created).slice(0, 300)}`)
  console.log('projectId', projectId)

  const project = await api('GET', `/v1/projects/${projectId}`)
  const snapshot = project.snapshot || {}
  const newDocBlocks = snapshot.document?.blocks || []
  const oldBlocks = snap.document.blocks
  const idMap = {}
  for (let i = 0; i < oldBlocks.length; i += 1) {
    if (oldBlocks[i] && newDocBlocks[i]) idMap[oldBlocks[i].id] = newDocBlocks[i].id
  }

  const titleParsed = (project.blocks || []).find((b) => b.type === 'title')
  const titleBlockId = titleParsed?.id
  if (!titleBlockId) throw new Error('title block not found')
  console.log('titleBlockId', titleBlockId)

  const patchFromAdjust = titleAdjustToPatch(titleBlockId)
  await api('PUT', `/v1/projects/${projectId}/title`, { title: patchFromAdjust.title })

  const brushHighlightColors = remapHighlightMap(snap.config.brushHighlightColors, idMap)

  await api('PATCH', `/v1/projects/${projectId}/config`, {
    patch: {
      pageOverlay: 'fengshui',
      aspectRatio: '9:16',
      showWordCount: false,
      topText: snap.config.topText,
      glyphEmphasis: patchFromAdjust.glyphEmphasis,
      colorHighlightColors: patchFromAdjust.colorHighlightColors,
      brushHighlightColors,
      titleLineGapEm: patchFromAdjust.titleLineGapEm,
      titleFontSize: 56,
      titleSecondaryFontSize: 56,
    },
  })

  mkdirSync(OUT, { recursive: true })
  const exported = await api('POST', `/v1/projects/${projectId}/export`, { outDir: OUT })
  console.log('export', JSON.stringify(exported).slice(0, 800))

  mkdirSync(GALLERY, { recursive: true })
  const { readdirSync } = await import('node:fs')
  for (const name of readdirSync(OUT)) {
    if (/\.(png|jpg)$/i.test(name)) {
      copyFileSync(join(OUT, name), join(GALLERY, name))
      console.log('copied', name)
    }
  }

  const fresh = await api('GET', `/v1/projects/${projectId}`)
  writeFileSync(
    join(GALLERY, 'era-project.json'),
    JSON.stringify(
      {
        version: 1,
        document: fresh.snapshot?.document,
        config: fresh.snapshot?.config,
        meta: { title: patchFromAdjust.title, topic: 'fengshui-floor-part1', titleAdjust },
      },
      null,
      2,
    ),
  )
  if (existsSync('public/gallery/2026-07-28/content.md')) {
    copyFileSync('public/gallery/2026-07-28/content.md', join(GALLERY, 'content.md'))
  }
  console.log('GALLERY', GALLERY)
  console.log('DONE', projectId)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
