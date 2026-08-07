#!/usr/bin/env node
/**
 * 统一鉴权网关：/auth/login 公开；/rest/v1 与 /functions/v1 需 cookie 或 X-Era-Auth
 */
import http from 'node:http'
import { URL } from 'node:url'
import {
  ERA_AUTH_HEADER,
  isAuthTokenValid,
  loginWithCredentials,
  readAuthTokenFromRequest,
  resolvePostgrestBases,
  restProxyBase,
} from './era-auth-core.mjs'

const PORT = Number(process.env.ERA_AUTH_PROXY_PORT || 8793)
const HOST = process.env.ERA_AUTH_PROXY_HOST || '0.0.0.0'
const REST_PROXY = restProxyBase().replace(/\/$/, '')
const ANON_KEY =
  process.env.ERA_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6ImVyYS1zZWxmaG9zdCIsImlhdCI6MTc4NTY3OTQ2NCwiZXhwIjoyMTAxMDM5NDY0fQ.EZAtzZ4yHkA8eB49KBQClsQqVdX9W4KF7FPeHsXhzjU'

const EXTRACT_UPSTREAM =
  process.env.ERA_EXTRACT_UPSTREAM || 'http://host.docker.internal:8791'
const FUNCTIONS_UPSTREAM =
  process.env.ERA_FUNCTIONS_UPSTREAM || 'https://kzoxyextxjwscrpjowud.functions.supabase.co'

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

async function proxyRequest(req, res, upstreamBase, stripPrefix, opts = {}) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  let path = url.pathname
  if (stripPrefix && path.startsWith(stripPrefix)) {
    path = path.slice(stripPrefix.length) || '/'
  }
  const target = new URL(path + url.search, upstreamBase.replace(/\/$/, '') + '/')

  const headers = { ...req.headers, host: opts.host || target.host }
  delete headers.connection

  const token = readAuthTokenFromRequest(req)
  if (token) headers[ERA_AUTH_HEADER.toLowerCase()] = token

  const init = { method: req.method, headers }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await readBody(req)
  }

  const upstream = await fetch(target, init)
  const outHeaders = Object.fromEntries(upstream.headers.entries())
  res.writeHead(upstream.status, outHeaders)
  const buf = Buffer.from(await upstream.arrayBuffer())
  res.end(buf)
}

function isPublicPath(pathname, method) {
  if (pathname === '/auth/health') return true
  if (pathname === '/auth/login' && method === 'POST') return true
  return false
}

async function handleAuthRoutes(req, res, pathname) {
  if (pathname === '/auth/health') {
    sendJson(res, 200, { ok: true })
    return true
  }
  if (pathname === '/auth/login' && req.method === 'POST') {
    let payload
    try {
      payload = JSON.parse((await readBody(req)).toString('utf8') || '{}')
    } catch {
      sendJson(res, 400, { error: 'invalid json' })
      return true
    }
    const hash = await loginWithCredentials(
      payload.username,
      payload.password,
      null,
      ANON_KEY,
    )
    if (!hash) {
      sendJson(res, 401, { error: '账号或密码错误' })
      return true
    }
    sendJson(res, 200, { ok: true, authHash: hash })
    return true
  }
  if (pathname === '/auth/session' && req.method === 'GET') {
    const token = readAuthTokenFromRequest(req)
    const ok = await isAuthTokenValid(token, null, ANON_KEY)
    sendJson(res, ok ? 200 : 401, { ok })
    return true
  }
  return false
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const pathname = url.pathname

    if (await handleAuthRoutes(req, res, pathname)) return

    if (isPublicPath(pathname, req.method || 'GET')) {
      sendJson(res, 404, { error: 'not found' })
      return
    }

    const token = readAuthTokenFromRequest(req)
    const valid = await isAuthTokenValid(token, null, ANON_KEY)
    if (!valid) {
      sendJson(res, 401, { error: '未登录或登录已失效' })
      return
    }

    if (pathname.startsWith('/rest/v1')) {
      await proxyRequest(req, res, REST_PROXY, '/rest/v1')
      return
    }

    // Caddy handle_path 曾剥前缀；兼容 /era_* 直透 PostgREST
    if (pathname.startsWith('/era_') || pathname.startsWith('/rpc/')) {
      await proxyRequest(req, res, REST_PROXY, '')
      return
    }

    if (pathname.startsWith('/functions/v1/create-extract-task') || pathname.startsWith('/functions/v1/create-govern-task')) {
      await proxyRequest(req, res, EXTRACT_UPSTREAM, '')
      return
    }

    if (pathname.startsWith('/functions/v1')) {
      await proxyRequest(req, res, FUNCTIONS_UPSTREAM, '/functions/v1', {
        host: 'kzoxyextxjwscrpjowud.functions.supabase.co',
      })
      return
    }

    sendJson(res, 404, { error: 'not found' })
  } catch (error) {
    console.error('[era-auth-proxy]', error)
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[era-auth-proxy] http://${HOST}:${PORT}`)
  console.log(`[era-auth-proxy] REST proxy → ${REST_PROXY}`)
  console.log(`[era-auth-proxy] REST candidates → ${resolvePostgrestBases().join(', ')}`)
})
