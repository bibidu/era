#!/usr/bin/env node
/**
 * 智能提取 + 临时数据治理任务服务（SWAS 本机）
 *
 * POST /functions/v1/create-extract-task
 * body: { items: [{ postId, images: string[] }] }  images 为 data URL 或 http(s) URL
 * 1) 上传/归一化图片链接 → 写入 extract_images，状态改为「提取中」，立即返回成功
 * 2) 后台调用 dashscope-video-extract，写回 extract_data（不覆盖 markdown），状态改为成功/失败
 *
 * POST /functions/v1/create-govern-task  （临时功能，用完删除）
 * body: { postId, images: string[] }  images 为 data URL 或 http(s) URL，有序
 * 1) 上传图片 → 完全替换 image_previews（并同步 cover_url），temp_govern_status=正在治理，立即返回成功
 * 2) 后台纵向拼接长图 → Qwen OCR 提取文字 → 替换 markdown（不碰 extract_data），更新治理状态
 */
import crypto from 'node:crypto'
import http from 'node:http'
import { URL } from 'node:url'
import { stitchImagesVerticalBuffers } from './stitch-images-vertical.mjs'

import {
  isAuthTokenValid,
  readAuthTokenFromRequest,
} from './era-auth-core.mjs'

const PORT = Number(process.env.EXTRACT_TASK_PORT || 8791)
const HOST = process.env.EXTRACT_TASK_HOST || '0.0.0.0'
const REST_URL = (process.env.ERA_REST_URL || 'http://127.0.0.1/rest/v1').replace(/\/$/, '')
const ANON_KEY =
  process.env.ERA_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6ImVyYS1zZWxmaG9zdCIsImlhdCI6MTc4NTY3OTQ2NCwiZXhwIjoyMTAxMDM5NDY0fQ.EZAtzZ4yHkA8eB49KBQClsQqVdX9W4KF7FPeHsXhzjU'
const DASHSCOPE_PROXY =
  process.env.DASHSCOPE_PROXY_URL || 'http://127.0.0.1/functions/v1/dashscope-video-extract'
const LEGACY_ANON =
  process.env.LEGACY_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b3h5ZXh0eGp3c2NycGpvd3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMDM4MjYsImV4cCI6MjEwMDY3OTgyNn0.FZuvFtxaMOUUGg3y7kNDxv_p4Etz2KrVpkCHpPKbmDU'
const ERA_AUTH_HASH = process.env.ERA_AUTH_HASH || ''
const ERA_REST_INTERNAL = (process.env.ERA_REST_INTERNAL || 'http://127.0.0.1:54321').replace(/\/$/, '')

const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || process.env.ALIYUN_ACCESS_KEY_ID || ''
const OSS_ACCESS_KEY_SECRET =
  process.env.OSS_ACCESS_KEY_SECRET || process.env.ALIYUN_ACCESS_KEY_SECRET || ''
const OSS_BUCKET = process.env.OSS_BUCKET || 'agent-17718139319'
const OSS_ENDPOINT = process.env.OSS_ENDPOINT || 'oss-cn-beijing.aliyuncs.com'
const OSS_PREFIX = (process.env.OSS_PREFIX || 'era/assets').replace(/\/$/, '')
const MAX_MEDIA_ITEMS = 12
const CONCURRENCY = 7
const MODEL = 'qwen3.7-flash'
/** 拼接长图过大时缩到该宽度再送 OCR，避免代理体积极限 */
const GOVERN_STITCH_MAX_WIDTH = 1080
const GOVERN_OCR_PROMPT =
  '请识别这张长图中的全部文字内容。按从上到下的阅读顺序，完整提取可见文字，保留原有换行与段落结构。直接输出提取的文字内容，不要添加解释、标题或前后缀。'

const EMPTY_EXTRACT_SCHEMA = {
  话题: '',
  发布日期: '',
  流量激励文案: '',
  播放量: '',
  点赞量: '',
  评论量: '',
  分享量: '',
  收藏量: '',
  划走率: '',
  文案展开率: '',
  平均浏览图片数: '',
  涨粉量: '',
  脱粉量: '',
  粉丝播放占比: '',
  封面点击率: '',
  文案读完率: '',
  评论进入率: '',
  点赞率: '',
  评论率: '',
  下载量: '',
  收藏率: '',
  分享率: '',
  不感兴趣率: '',
  流量来源_推荐页: '',
  流量来源_个人主页: '',
  流量来源_朋友页: '',
  流量来源_搜索页: '',
  流量来源_关注页: '',
  平台扶持流量: '',
  吸粉量: '',
  吸粉率: '',
  脱粉率: '',
  不感兴趣量: '',
  观众兴趣_最多: '',
  观众喜欢_关注的同类作者: [],
  观众常搜的搜索词: [],
  观众喜欢的话题: [],
  观众特征总结_性别年龄: '',
  观众特征总结_地域: '',
  观众特征总结_兴趣职业: '',
  观众区域_最多: '',
  观众城市等级_最多: '',
  观众性别男性占比: '',
  观众年龄_最多: '',
  观众职业: [],
}

const EXTRACT_PROMPT = `你只需要按照如下JSON的key提取信息，并将指标数据填到对应的value中，如果没有发现该数据则填写未知。
完整待提取的JSON数据是：

${JSON.stringify(EMPTY_EXTRACT_SCHEMA, null, 2)}`

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,apikey,Content-Type,Prefer,X-Client-Info,X-Era-Auth',
  })
  res.end(payload)
}

async function rest(path, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('apikey', ANON_KEY)
  headers.set('Authorization', `Bearer ${ANON_KEY}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (init.prefer) headers.set('Prefer', init.prefer)
  if (ERA_AUTH_HASH) {
    headers.set('X-Era-Auth', ERA_AUTH_HASH)
  }
  const response = await fetch(`${REST_URL}/${path.replace(/^\//, '')}`, {
    ...init,
    headers,
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`REST ${response.status}: ${text.slice(0, 300)}`)
  }
  return text ? JSON.parse(text) : null
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return {
    contentType: match[1] || 'image/jpeg',
    buffer: Buffer.from(match[2], 'base64'),
  }
}

function ossSign(method, contentType, date, ossHeaders, resource) {
  const canonicalHeaders = Object.keys(ossHeaders)
    .sort()
    .map((key) => `${key}:${ossHeaders[key]}`)
    .join('\n')
  const parts = [method, '', contentType, date]
  if (canonicalHeaders) parts.push(canonicalHeaders)
  parts.push(resource)
  const stringToSign = parts.join('\n')
  const signature = crypto.createHmac('sha1', OSS_ACCESS_KEY_SECRET).update(stringToSign).digest('base64')
  return `OSS ${OSS_ACCESS_KEY_ID}:${signature}`
}

async function uploadToOss(buffer, contentType, objectKey) {
  if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET) {
    throw new Error('缺少 OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET，无法上传提取图片')
  }
  const date = new Date().toUTCString()
  const ossHeaders = {
    'x-oss-object-acl': 'public-read',
  }
  const resource = `/${OSS_BUCKET}/${objectKey}`
  const authorization = ossSign('PUT', contentType, date, ossHeaders, resource)
  const url = `https://${OSS_BUCKET}.${OSS_ENDPOINT}/${objectKey}`
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Date: date,
      'Content-Type': contentType,
      Authorization: authorization,
      'x-oss-object-acl': 'public-read',
      'Content-Length': String(buffer.length),
    },
    body: buffer,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OSS 上传失败 ${response.status}: ${text.slice(0, 240)}`)
  }
  return url
}

async function normalizeImages(postId, images, options = {}) {
  const list = (Array.isArray(images) ? images : []).filter((item) => typeof item === 'string' && item.trim())
  const limited = list.slice(0, MAX_MEDIA_ITEMS)
  const urls = []
  const stamp = Date.now()
  const folder = options.folder || 'extract'
  const keepMark = options.keepMark || '__extract_keep__'
  for (let index = 0; index < limited.length; index += 1) {
    const item = limited[index].trim()
    if (/^https?:\/\//i.test(item)) {
      urls.push(item)
      continue
    }
    const parsed = parseDataUrl(item)
    if (!parsed) {
      throw new Error(`第 ${index + 1} 张图片既不是 URL 也不是 data URL`)
    }
    const ext = parsed.contentType.includes('png')
      ? 'png'
      : parsed.contentType.includes('webp')
        ? 'webp'
        : 'jpg'
    const key = `${OSS_PREFIX}/${folder}/${postId}/${stamp}-${index}${keepMark}.${ext}`
    urls.push(await uploadToOss(parsed.buffer, parsed.contentType, key))
  }
  if (urls.length === 0) {
    throw new Error('缺少图片')
  }
  return urls
}

async function downloadImageBuffer(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`下载图片失败 HTTP ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function parseModelJson(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) throw new Error('模型未返回内容')
  try {
    return JSON.parse(trimmed)
  } catch {
    // continue
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim())
    } catch {
      // continue
    }
  }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1))
  }
  throw new Error('模型未返回合法 JSON')
}

function dashScopeProxyHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    apikey: LEGACY_ANON,
    Authorization: `Bearer ${LEGACY_ANON}`,
  }
  // 经 Caddy → era-auth-proxy 反代时必须带登录 hash，否则 401 导致「提取失败」
  if (ERA_AUTH_HASH) {
    headers['X-Era-Auth'] = ERA_AUTH_HASH
  }
  return headers
}

async function runDashScope(imageUrls, prompt, { parseJson = false } = {}) {
  const media = imageUrls.map((url) => ({ type: 'image', url }))
  const response = await fetch(DASHSCOPE_PROXY, {
    method: 'POST',
    headers: dashScopeProxyHeaders(),
    body: JSON.stringify({
      model: MODEL,
      media,
      fps: 1,
      prompt,
    }),
  })
  const text = await response.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(text.slice(0, 240) || `DashScope proxy HTTP ${response.status}`)
  }
  if (!response.ok) {
    throw new Error(data.error || data.message || `DashScope proxy HTTP ${response.status}`)
  }
  const markdown = typeof data.markdown === 'string' ? data.markdown : JSON.stringify(data)
  return parseJson ? parseModelJson(markdown) : markdown.trim()
}

async function runDashScopeExtract(imageUrls) {
  return runDashScope(imageUrls, EXTRACT_PROMPT, { parseJson: true })
}

async function patchPost(postId, patch) {
  await rest(`era_social_video_analyses?id=eq.${encodeURIComponent(postId)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify(patch),
  })
}

async function mapPool(items, concurrency, worker) {
  let cursor = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      await worker(items[index], index)
    }
  })
  await Promise.all(runners)
}

async function processExtractBackground(jobs) {
  await mapPool(jobs, CONCURRENCY, async (job) => {
    try {
      const result = await runDashScopeExtract(job.imageUrls)
      await patchPost(job.postId, {
        extract_data: JSON.stringify(result),
        extract_status: '提取成功',
      })
      console.log(`[extract-task] success ${job.postId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[extract-task] fail ${job.postId}: ${message}`)
      try {
        await patchPost(job.postId, { extract_status: '提取失败' })
      } catch (patchError) {
        console.error(`[extract-task] status patch fail ${job.postId}`, patchError)
      }
    }
  })
}

async function createTasks(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('items 不能为空')
  }

  const accepted = []
  for (const item of items) {
    const postId = String(item?.postId || '').trim()
    if (!postId) throw new Error('缺少 postId')
    const imageUrls = await normalizeImages(postId, item.images)
    await patchPost(postId, {
      extract_images: imageUrls,
      extract_status: '提取中',
    })
    accepted.push({ postId, imageUrls })
  }

  // 异步提取，不阻塞创建成功响应
  setImmediate(() => {
    void processExtractBackground(accepted)
  })

  return { ok: true, count: accepted.length }
}

async function processGovernBackground(job) {
  const { postId, imageUrls } = job
  try {
    console.log(`[govern-task] start OCR ${postId} images=${imageUrls.length}`)
    const buffers = []
    for (const url of imageUrls) {
      buffers.push(await downloadImageBuffer(url))
    }
    const stitched = await stitchImagesVerticalBuffers(buffers, {
      targetWidth: GOVERN_STITCH_MAX_WIDTH,
      format: 'jpeg',
      quality: 82,
    })
    const stamp = Date.now()
    const stitchKey = `${OSS_PREFIX}/govern/${postId}/${stamp}-stitched__cover_keep__.jpg`
    const stitchUrl = await uploadToOss(stitched.buffer, stitched.contentType, stitchKey)
    const text = await runDashScope([stitchUrl], GOVERN_OCR_PROMPT, { parseJson: false })
    if (!text) throw new Error('模型未返回文字内容')
    await patchPost(postId, {
      markdown: text,
      temp_govern_status: '治理成功',
    })
    console.log(`[govern-task] success ${postId} chars=${text.length}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[govern-task] fail ${postId}: ${message}`)
    try {
      await patchPost(postId, { temp_govern_status: '治理失败' })
    } catch (patchError) {
      console.error(`[govern-task] status patch fail ${postId}`, patchError)
    }
  }
}

async function createGovernTask(body) {
  const postId = String(body?.postId || '').trim()
  if (!postId) throw new Error('缺少 postId')
  const imageUrls = await normalizeImages(postId, body.images, {
    folder: 'govern',
    keepMark: '__cover_keep__',
  })

  // 1) 入库替换预览图后即可返回「提交成功」；OCR 异步
  await patchPost(postId, {
    image_previews: imageUrls,
    cover_url: imageUrls[0] || null,
    temp_govern_status: '正在治理',
  })

  setImmediate(() => {
    void processGovernBackground({ postId, imageUrls })
  })

  return { ok: true, postId, imageCount: imageUrls.length, temp_govern_status: '正在治理' }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const path = url.pathname.replace(/\/+$/, '') || '/'

  if (req.method === 'OPTIONS') {
    json(res, 204, {})
    return
  }

  if (
    req.method === 'GET' &&
    (path === '/healthz' ||
      path === '/functions/v1/create-extract-task/health' ||
      path === '/functions/v1/create-govern-task/health')
  ) {
    json(res, 200, { ok: true })
    return
  }

  const authToken = readAuthTokenFromRequest(req) || ERA_AUTH_HASH
  const authed = await isAuthTokenValid(authToken, ERA_REST_INTERNAL, ANON_KEY)
  if (!authed) {
    json(res, 401, { error: '未登录或登录已失效' })
    return
  }

  const isGovernCreate =
    req.method === 'POST' &&
    (path === '/functions/v1/create-govern-task' || path === '/create-govern-task')

  const isExtractCreate =
    req.method === 'POST' &&
    (path === '/functions/v1/create-extract-task' || path === '/create-extract-task' || path === '/')

  if (!isGovernCreate && !isExtractCreate) {
    json(res, 404, { error: 'Not found' })
    return
  }

  try {
    const raw = await readBody(req)
    const body = raw ? JSON.parse(raw) : {}
    if (isGovernCreate) {
      const result = await createGovernTask(body)
      json(res, 200, result)
      return
    }
    const items = Array.isArray(body.items)
      ? body.items
      : body.postId
        ? [{ postId: body.postId, images: body.images }]
        : []
    const result = await createTasks(items)
    json(res, 200, result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[${isGovernCreate ? 'govern-task' : 'extract-task'}] create failed`, message)
    json(res, 400, { error: message })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[extract-task] listening on ${HOST}:${PORT}`)
})
