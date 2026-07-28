#!/usr/bin/env node
/**
 * 楼层下篇：创建工程、套用与上篇相同的 ERA_TITLE_ADJUST（「下篇」）、可选导出。
 * 用法：
 *   node scripts/apply-title-adjust-export-xia.mjs
 *   node scripts/apply-title-adjust-export-xia.mjs --export
 *   node scripts/apply-title-adjust-export-xia.mjs --auto-highlight --export
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { encodeGlyphEmphasis } from '../src/features/graphic-text/glyphEmphasis.ts'

const AGENT = process.env.ERA_AGENT_URL || 'http://127.0.0.1:3847'
const OUT = '/tmp/era-xia-export'
const GALLERY = join(
  process.cwd(),
  'public/gallery',
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }),
)
const CONTENT = join(GALLERY, 'content-xia.md')
const doExport = process.argv.includes('--export')
const autoHighlight = process.argv.includes('--auto-highlight')

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
        { ch: '%', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 36, scaleX: 1, scaleY: 1, widthEm: 0.9, color: '#111111' },
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
        { ch: '「', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 42, scaleX: 1, scaleY: 1, widthEm: 1, color: '#111111' },
        { ch: '下', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 42, scaleX: 1, scaleY: 1, widthEm: 1, color: '#111111' },
        { ch: '篇', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 42, scaleX: 1, scaleY: 1, widthEm: 1, color: '#111111' },
        { ch: '」', fontId: 'song', fontFamily: '"Noto Serif SC", serif', fontSize: 42, scaleX: 1, scaleY: 1, widthEm: 1, color: '#111111' },
      ],
    },
  ],
}

const TOP_TEXT = '连续观看、点赞、关注，你也会是地理风水达人(阳宅篇)'

async function api(method, path, body) {
  const res = await fetch(`${AGENT}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 800)}`)
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

/** 与上篇一致：高亮「N 层」层号（含括号前数字与「层」字），笔刷明黄 */
function buildFloorBrushRanges(blocks) {
  const ranges = []
  const re = /^(\*\*)?(\d+\s*层)/
  for (const b of blocks) {
    if (b.type !== 'paragraph') continue
    const text = b.plainText || b.text || ''
    const m = text.match(/^(\d+)\s*层/)
    if (!m) continue
    const end = m[0].length
    for (let i = 0; i < end; i += 1) {
      ranges.push({
        blockId: b.id,
        start: i,
        end: i + 1,
        style: 'brush',
        color: '#FACC15',
      })
    }
  }
  return ranges
}

async function main() {
  const markdown = readFileSync(CONTENT, 'utf8')
  const reuseId = process.env.ERA_PROJECT_ID
  let projectId = reuseId
  if (reuseId) {
    await api('PUT', `/v1/projects/${reuseId}/markdown`, { markdown })
    console.log('reused projectId', projectId)
  } else {
    const created = await api('POST', '/v1/projects', {
      markdown,
      title: '买房租房选楼层|99%的人都选错了|「下篇」',
      config: {
        pageOverlay: 'fengshui',
        aspectRatio: '9:16',
        showWordCount: false,
        topText: TOP_TEXT,
        titleFontId: 'song',
        titleFontFamily: '"Noto Serif SC", serif',
        headingFontId: 'song',
        headingFontFamily: '"Noto Serif SC", serif',
        bodyFontId: 'song',
        bodyFontFamily: '"Noto Serif SC", serif',
      },
    })
    projectId = created.id || created.projectId || created.project?.id
    if (!projectId) throw new Error(`no project id: ${JSON.stringify(created).slice(0, 300)}`)
    console.log('projectId', projectId)
  }

  const project = await api('GET', `/v1/projects/${projectId}`)
  const titleParsed = (project.blocks || []).find((b) => b.type === 'title')
  const titleBlockId = titleParsed?.id
  if (!titleBlockId) throw new Error('title block not found')
  console.log('titleBlockId', titleBlockId)

  const patchFromAdjust = titleAdjustToPatch(titleBlockId)
  await api('PUT', `/v1/projects/${projectId}/title`, { title: patchFromAdjust.title })

  await api('PATCH', `/v1/projects/${projectId}/config`, {
    patch: {
      pageOverlay: 'fengshui',
      aspectRatio: '9:16',
      showWordCount: false,
      topText: TOP_TEXT,
      glyphEmphasis: patchFromAdjust.glyphEmphasis,
      colorHighlightColors: patchFromAdjust.colorHighlightColors,
      titlePrimaryColor: '#b51a00',
      titleLineGapEm: patchFromAdjust.titleLineGapEm,
      titleFontSize: 56,
      titleSecondaryFontSize: 56,
    },
  })

  if (autoHighlight) {
    const fresh = await api('GET', `/v1/projects/${projectId}`)
    const ranges = buildFloorBrushRanges(fresh.blocks || [])
    console.log('auto brush ranges', ranges.length)
    await api('POST', `/v1/projects/${projectId}/highlights`, { replace: true, ranges })
  }

  // 高亮 replace 后重写标题色与字形强调
  await api('PATCH', `/v1/projects/${projectId}/config`, {
    patch: {
      colorHighlightColors: patchFromAdjust.colorHighlightColors,
      titlePrimaryColor: '#b51a00',
      glyphEmphasis: patchFromAdjust.glyphEmphasis,
      titleLineGapEm: patchFromAdjust.titleLineGapEm,
    },
  })

  const share = await api('POST', `/v1/projects/${projectId}/highlight-setup-share`, {})
  console.log('highlightShare', JSON.stringify(share))

  mkdirSync(GALLERY, { recursive: true })
  const snap = await api('GET', `/v1/projects/${projectId}`)
  writeFileSync(
    join(GALLERY, 'era-project-xia.json'),
    JSON.stringify(
      {
        version: 1,
        document: snap.snapshot?.document,
        config: snap.snapshot?.config,
        meta: {
          title: patchFromAdjust.title,
          topic: 'fengshui-floor-part2',
          titleAdjust,
          projectId,
          highlightSetupUrl: share.url || share.pagesUrl,
          shareId: share.shareId,
        },
      },
      null,
      2,
    ),
  )

  if (doExport) {
    const { rmSync } = await import('node:fs')
    rmSync(OUT, { recursive: true, force: true })
    mkdirSync(OUT, { recursive: true })
    const exported = await api('POST', `/v1/projects/${projectId}/export`, { outDir: OUT })
    console.log('export', JSON.stringify(exported).slice(0, 1000))
    // 清掉旧的 xia-graphic-page-*，避免残留多页
    for (const name of readdirSync(GALLERY)) {
      if (/^xia-graphic-page-\d+\.png$/i.test(name) || name === 'xia-graphic-review-sheet.png') {
        rmSync(join(GALLERY, name), { force: true })
      }
    }
    for (const name of readdirSync(OUT)) {
      if (!/\.(png|jpg)$/i.test(name)) continue
      const dest = name.startsWith('graphic-') ? `xia-${name}` : `xia-${name}`
      copyFileSync(join(OUT, name), join(GALLERY, dest))
      console.log('copied', dest)
    }
  }

  console.log('DONE', projectId)
  console.log('HIGHLIGHT_URL', share.url || share.pagesUrl)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
