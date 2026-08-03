/** RFC4122 v4，仅用 getRandomValues（HTTP 非安全上下文也可用） */
function uuidV4FromGetRandomValues(): string {
  const bytes = new Uint8Array(16)
  if (!globalThis.crypto?.getRandomValues) {
    // 极端回退：无 crypto 时用 Math.random（仅防崩）
    for (let i = 0; i < 16; i += 1) bytes[i] = (Math.random() * 256) | 0
  } else {
    globalThis.crypto.getRandomValues(bytes)
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * 生成 UUID。HTTP 非安全上下文没有 crypto.randomUUID，需回退。
 * 注意：勿用依赖 randomUUID 的第三方实现做 polyfill，会递归爆栈。
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
  return uuidV4FromGetRandomValues()
}

/** 为仍直接调用 crypto.randomUUID 的代码补齐（须尽早执行） */
export function ensureRandomUUID(): void {
  const c = globalThis.crypto as Crypto | undefined
  if (!c) return
  if (typeof c.randomUUID === 'function') {
    try {
      c.randomUUID()
      return
    } catch {
      // 存在但在非安全上下文会抛错 → 覆盖
    }
  }
  Object.defineProperty(c, 'randomUUID', {
    value: () => uuidV4FromGetRandomValues(),
    configurable: true,
    writable: true,
  })
}
