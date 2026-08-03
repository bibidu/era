import { v4 as uuidv4 } from 'uuid'

/**
 * 生成 UUID。HTTP 非安全上下文没有 crypto.randomUUID，需回退。
 */
export function createId(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c && typeof c.randomUUID === 'function') {
    try {
      return c.randomUUID()
    } catch {
      // insecure context / incomplete crypto
    }
  }
  return uuidv4()
}

/** 为仍直接调用 crypto.randomUUID 的代码补齐（须尽早执行） */
export function ensureRandomUUID(): void {
  const c = globalThis.crypto as Crypto | undefined
  if (!c || typeof c.randomUUID === 'function') return
  Object.defineProperty(c, 'randomUUID', {
    value: () => uuidv4(),
    configurable: true,
    writable: true,
  })
}
