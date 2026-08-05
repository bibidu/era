#!/usr/bin/env node
/**
 * 将多张图片按顺序纵向拼成一张长图（统一宽度）。
 *
 * CLI:
 *   node scripts/stitch-images-vertical.mjs --out <path> <img1> <img2> ...
 *   node scripts/stitch-images-vertical.mjs --out <path> --json '["/a.jpg","/b.jpg"]'
 *
 * 也可被 extract-task-server 等 import：
 *   import { stitchImagesVerticalBuffers } from './stitch-images-vertical.mjs'
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

/**
 * @param {Buffer[]} buffers
 * @param {{ targetWidth?: number, gapPx?: number, background?: string, format?: 'jpeg'|'png'|'webp', quality?: number }} [options]
 * @returns {Promise<{ buffer: Buffer, contentType: string, width: number, height: number }>}
 */
export async function stitchImagesVerticalBuffers(buffers, options = {}) {
  if (!Array.isArray(buffers) || buffers.length === 0) {
    throw new Error('没有可拼接的图片')
  }

  const gapPx = Math.max(0, Number(options.gapPx) || 0)
  const background = options.background || '#FFFFFF'
  const format = options.format || 'jpeg'
  const quality = Number.isFinite(options.quality) ? options.quality : 82

  const metas = await Promise.all(
    buffers.map(async (buf, index) => {
      const image = sharp(buf, { failOn: 'none' })
      const meta = await image.metadata()
      const width = meta.width || 0
      const height = meta.height || 0
      if (width <= 0 || height <= 0) {
        throw new Error(`第 ${index + 1} 张图片无法解析尺寸`)
      }
      return { buf, width, height }
    }),
  )

  const targetWidth = Math.max(
    1,
    Math.round(options.targetWidth || Math.max(...metas.map((item) => item.width))),
  )

  const resized = []
  for (const item of metas) {
    const height = Math.max(1, Math.round((item.height * targetWidth) / item.width))
    const out = await sharp(item.buf, { failOn: 'none' })
      .resize({ width: targetWidth, height, fit: 'fill' })
      .ensureAlpha()
      .png()
      .toBuffer({ resolveWithObject: true })
    resized.push({ buffer: out.data, width: out.info.width, height: out.info.height })
  }

  const totalHeight =
    resized.reduce((sum, item) => sum + item.height, 0) + gapPx * Math.max(0, resized.length - 1)

  const composites = []
  let top = 0
  for (const item of resized) {
    composites.push({ input: item.buffer, top, left: 0 })
    top += item.height + gapPx
  }

  let pipeline = sharp({
    create: {
      width: targetWidth,
      height: Math.max(1, totalHeight),
      channels: 3,
      background,
    },
  }).composite(composites)

  let contentType = 'image/jpeg'
  if (format === 'png') {
    pipeline = pipeline.png()
    contentType = 'image/png'
  } else if (format === 'webp') {
    pipeline = pipeline.webp({ quality })
    contentType = 'image/webp'
  } else {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true })
    contentType = 'image/jpeg'
  }

  const buffer = await pipeline.toBuffer()
  return { buffer, contentType, width: targetWidth, height: Math.max(1, totalHeight) }
}

function parseArgs(argv) {
  const outIndex = argv.indexOf('--out')
  if (outIndex < 0 || !argv[outIndex + 1]) {
    throw new Error('缺少 --out <path>')
  }
  const outPath = argv[outIndex + 1]
  const jsonIndex = argv.indexOf('--json')
  if (jsonIndex >= 0) {
    const list = JSON.parse(argv[jsonIndex + 1] || '[]')
    if (!Array.isArray(list) || list.length === 0) throw new Error('--json 需为非空路径数组')
    return { outPath, inputs: list.map(String) }
  }
  const inputs = argv.filter((arg, index) => {
    if (arg.startsWith('--')) return false
    if (index === outIndex + 1) return false
    if (jsonIndex >= 0 && index === jsonIndex + 1) return false
    return true
  })
  if (inputs.length === 0) throw new Error('请提供至少一张输入图片路径')
  return { outPath, inputs }
}

async function main() {
  const { outPath, inputs } = parseArgs(process.argv.slice(2))
  const buffers = await Promise.all(inputs.map((file) => fs.readFile(file)))
  const result = await stitchImagesVerticalBuffers(buffers)
  await fs.mkdir(path.dirname(path.resolve(outPath)), { recursive: true })
  await fs.writeFile(outPath, result.buffer)
  console.log(
    JSON.stringify({
      ok: true,
      out: outPath,
      width: result.width,
      height: result.height,
      bytes: result.buffer.length,
      contentType: result.contentType,
    }),
  )
}

const isDirectRun =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
