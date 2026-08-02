import { useEffect, useState, type RefObject } from 'react'

export type UseInViewportOptions = {
  /** 滚动容器；null/undefined 则相对浏览器视口 */
  root?: Element | null
  /** 进入一次后保持 true 并 disconnect */
  once?: boolean
  /** 覆盖默认 rootMargin；封面懒加载宜用 `0px`，避免提前预取 */
  rootMargin?: string
  /**
   * 可见比例阈值（0–1）。
   * 默认 0：任意相交即触发；封面图用 `1/3` 表示露出三分之一以上才加载。
   */
  threshold?: number
}

/** 元素在滚动视口内达到可见比例后为 true；用于封面等重资源按需加载 */
export function useInViewport(
  targetRef: RefObject<Element | null>,
  options: UseInViewportOptions = {},
): boolean {
  const { root = null, once = true, rootMargin = '0px', threshold = 0 } = options
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (active && once) return
    const el = targetRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setActive(true)
      return
    }

    const ratioThreshold = Math.min(1, Math.max(0, threshold))

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // isIntersecting 在 threshold>0 时表示已达该比例
          if (!entry.isIntersecting) continue
          if (ratioThreshold > 0 && entry.intersectionRatio + 1e-6 < ratioThreshold) continue
          setActive(true)
          if (once) obs.disconnect()
        }
      },
      {
        root: root ?? null,
        rootMargin,
        // 同时观察 0 与目标阈值，滚动过程中能收到足够回调
        threshold: ratioThreshold > 0 ? [0, ratioThreshold, 1] : 0,
      },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [active, once, root, rootMargin, targetRef, threshold])

  return active
}
