/**
 * 回归：鉴权网关转发已解压 body 时不得带 content-encoding / 错误 content-length。
 * 运行：node scripts/era-auth-proxy-headers-smoke.mjs
 */
import { sanitizeProxyResponseHeaders } from './era-auth-core.mjs'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const fake = new Headers({
  'Content-Type': 'application/json; charset=utf-8',
  'Content-Encoding': 'gzip',
  'Content-Length': '315',
  'Transfer-Encoding': 'chunked',
  'Set-Cookie': '__cf_bm=x; Domain=supabase.co',
  'Sb-Request-Id': 'test-id',
})

const body = Buffer.from(
  JSON.stringify({
    availableAmount: '50.09',
    note: '此为阿里云账户可用额度',
  }),
  'utf8',
)

const out = sanitizeProxyResponseHeaders(fake, body.length)
assert(out['content-encoding'] == null, 'must strip content-encoding')
assert(out['transfer-encoding'] == null, 'must strip transfer-encoding')
assert(out['set-cookie'] == null, 'must strip set-cookie')
assert(out['content-length'] === String(body.length), `content-length must be ${body.length}`)
assert(out['content-type'] === 'application/json; charset=utf-8', 'keep content-type')
assert(out['sb-request-id'] === 'test-id', 'keep sb-request-id')

console.log('ok era-auth-proxy-headers-smoke')
