#!/usr/bin/env node
/** Era Agent REST 的最小客户端：统一带上 X-Era-Auth，供蛇大师 / 图文 skill 的脚本复用。 */
import { ERA_AUTH_HEADER, knownAuthHashes } from './era-auth-core.mjs'

const HOST = process.env.ERA_AGENT_HOST || '127.0.0.1'
const PORT = process.env.ERA_AGENT_PORT || '3847'
export const ERA_BASE = `http://${HOST}:${PORT}`

function authToken() {
  return process.env.ERA_AUTH_HASH?.trim() || [...knownAuthHashes()][0]
}

export async function eraFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${ERA_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      [ERA_AUTH_HEADER]: authToken(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${text.slice(0, 500)}`)
  return text ? JSON.parse(text) : null
}
