import { ChevronLeft } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { TopModeTabs, type AppMode } from './components/TopModeTabs'
import {
  ERA_URL_CHANGE_EVENT,
  navigateBackFromGraphic,
  pushGraphicInUrl,
  readAppTabFromSearch,
  readSocialPostIdFromSearch,
  replaceAppTabInUrl,
} from './app/tabRouting'
import { useEdgeSwipeBack } from './hooks/useEdgeSwipeBack'
import { useEraTheme } from './theme/useEraTheme'

/** 切换到图文前预取默认字体 CSS，缩短正文空白窗口 */
function preloadGraphicFonts() {
  const base = import.meta.env.BASE_URL || '/'
  const hrefs = [`${base}fonts/noto-serif-sc.css`, `${base}fonts/alimama-shuheiti.css`]
  for (const href of hrefs) {
    if (document.querySelector(`link[data-era-font-preload="${href}"]`)) continue
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'style'
    link.href = href
    link.dataset.eraFontPreload = href
    document.head.appendChild(link)
  }
}

const GraphicTextWorkspace = lazy(() =>
  import('./features/graphic-text/GraphicTextWorkspace').then((m) => ({
    default: m.GraphicTextWorkspace,
  })),
)
const DataAnalysisWorkspace = lazy(() =>
  import('./features/social-video/DataAnalysisWorkspace').then((m) => ({
    default: m.DataAnalysisWorkspace,
  })),
)
const AccountBalancePage = lazy(() =>
  import('./features/account/AccountBalancePage').then((m) => ({
    default: m.AccountBalancePage,
  })),
)

function TabLoadingFallback() {
  return (
    <div
      className="flex min-h-0 flex-1 items-center justify-center text-sm"
      style={{ color: 'var(--era-muted)' }}
    >
      加载中...
    </div>
  )
}

function GraphicSecondaryPage({ onBack }: { onBack: () => void }) {
  const swipe = useEdgeSwipeBack(onBack)

  return (
    <div
      ref={swipe.ref}
      className="relative flex min-h-0 flex-1 flex-col"
      style={{ background: 'var(--era-bg)', color: 'var(--era-fg)', ...swipe.style }}
      onPointerDown={swipe.onPointerDown}
      onPointerMove={swipe.onPointerMove}
      onPointerUp={swipe.onPointerUp}
      onPointerCancel={swipe.onPointerCancel}
    >
      <header
        className="flex shrink-0 items-center gap-2 border-b px-3"
        style={{
          borderColor: 'var(--era-border)',
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '0.75rem',
          background: 'var(--era-header)',
        }}
      >
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full"
          style={{ background: 'var(--era-panel)' }}
          aria-label="返回"
          onClick={onBack}
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="min-w-0 flex-1 text-base font-semibold">图文</h1>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Suspense fallback={<TabLoadingFallback />}>
          <GraphicTextWorkspace />
        </Suspense>
      </div>
    </div>
  )
}

function App() {
  const [mode, setMode] = useState<AppMode>(() => readAppTabFromSearch())
  const [balanceOpen, setBalanceOpen] = useState(false)
  const { theme, toggle } = useEraTheme()

  const syncFromUrl = useCallback(() => {
    setMode(readAppTabFromSearch())
  }, [])

  useEffect(() => {
    const initial = readAppTabFromSearch()
    replaceAppTabInUrl(initial, {
      keepSocialPost: Boolean(readSocialPostIdFromSearch()) && initial === 'data',
      graphicEntry: initial === 'graphic' ? 'replace' : null,
    })
    window.addEventListener('popstate', syncFromUrl)
    window.addEventListener(ERA_URL_CHANGE_EVENT, syncFromUrl)
    return () => {
      window.removeEventListener('popstate', syncFromUrl)
      window.removeEventListener(ERA_URL_CHANGE_EVENT, syncFromUrl)
    }
  }, [syncFromUrl])

  useEffect(() => {
    if (mode === 'graphic') preloadGraphicFonts()
  }, [mode])

  const closeGraphic = useCallback(() => {
    navigateBackFromGraphic()
    if (readAppTabFromSearch() !== 'graphic') {
      setMode('data')
    }
  }, [])

  const handleModeChange = useCallback(
    (next: AppMode) => {
      setBalanceOpen(false)
      if (next === 'graphic') {
        setMode('graphic')
        pushGraphicInUrl()
        return
      }
      if (mode === 'graphic') {
        navigateBackFromGraphic()
        setMode('data')
        return
      }
      setMode('data')
      replaceAppTabInUrl('data', { keepSocialPost: false })
    },
    [mode],
  )

  // 帖子详情不藏顶栏：否则手势返回时顶栏突然出现会改变列表高度，造成抖动
  const hideTopTabs = balanceOpen || mode === 'graphic'
  const wideLayout = mode === 'data' && !hideTopTabs

  return (
    <div
      className={`era-app-shell relative mx-auto flex h-dvh w-full flex-col overflow-hidden ${
        wideLayout ? 'max-w-5xl' : 'max-w-lg'
      }`}
      style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}
    >
      <div
        id="era-safari-tint"
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[10000]"
        style={{
          height: 'max(8px, env(safe-area-inset-top, 0px))',
          backgroundColor: 'var(--era-shell-bg, var(--era-header))',
        }}
      />
      {!hideTopTabs ? (
        <header
          className="sticky top-0 z-40 flex w-full shrink-0 items-center justify-center border-b px-4 py-2"
          style={{
            borderColor: 'var(--era-border)',
            background: 'var(--era-header)',
            paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
          }}
        >
          <TopModeTabs
            value="data"
            onChange={handleModeChange}
            theme={theme}
            onToggleTheme={toggle}
            onOpenBalance={() => setBalanceOpen(true)}
          />
        </header>
      ) : null}

      <Suspense fallback={<TabLoadingFallback />}>
        {balanceOpen ? (
          <AccountBalancePage onBack={() => setBalanceOpen(false)} />
        ) : mode === 'graphic' ? (
          <GraphicSecondaryPage onBack={closeGraphic} />
        ) : (
          <DataAnalysisWorkspace />
        )}
      </Suspense>
    </div>
  )
}

export default App
