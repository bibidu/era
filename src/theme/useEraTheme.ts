import { useEffect, useState } from 'react'
import {
  applyTheme,
  ERA_DESKTOP_SHELL_MQ,
  readStoredTheme,
  toggleTheme,
  type EraTheme,
} from './theme'

export function useEraTheme() {
  const [theme, setTheme] = useState<EraTheme>(() => {
    if (typeof window === 'undefined') {
      return 'dark'
    }
    return readStoredTheme()
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const mq = window.matchMedia(ERA_DESKTOP_SHELL_MQ)
    const onChange = () => applyTheme(theme)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  return {
    theme,
    setTheme,
    toggle: () => {
      const next = toggleTheme(theme)
      applyTheme(next)
      // Safari 26+ 顶栏颜色仅在首屏采样，reload 可同步但体验差，先关闭。
      // if (prefersSafariToolbarReload()) {
      //   window.location.reload()
      //   return
      // }
      setTheme(next)
    },
  }
}
