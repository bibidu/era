import { useEffect, useState, type RefObject } from 'react'

export type UseInViewportOptions = {
  /** 滚动容器；null/undefined 则相对浏览器视口 */
  root?: Element | null
  /** 进入一次后保持 true 并 disconnect */
  once?: boolean
  /** 覆盖默认 rootMargin */
  rootMargin?: string
}

function defaultRootMargin(): string {
  if (typeof window === 'undefined') return '120px 0px'
  // 移动端预加载更短，PC 多预取一屏
  return window.matchMedia('(max-width: 639px)').matches ? '96px 0px' : '240px 0px'
}

/** 元素进入（滚动）视口后为 true；用于封面等重资源按需加载 */
export function useInViewport(
  targetRef: RefObject<Element | null>,
  options: UseInViewportOptions = {},
): boolean {
  const { root = null, once = true, rootMargin } = options
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (active && once) return
    const el = targetRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setActive(true)
      return
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          setActive(true)
          if (once) obs.disconnect()
        }
      },
      {
        root: root ?? null,
        rootMargin: rootMargin ?? defaultRootMargin(),
        threshold: 0.01,
      },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [active, once, root, rootMargin, targetRef])

  return active
}
