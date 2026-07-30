import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { TopModeTabs, type AppMode } from './components/TopModeTabs'
import {
  readAppTabFromSearch,
  readHighlightIdsFromSearch,
  readTitleTextFromSearch,
  replaceAppTabInUrl,
} from './app/tabRouting'
import { useEraTheme } from './theme/useEraTheme'

const GraphicTextWorkspace = lazy(() =>
  import('./features/graphic-text/GraphicTextWorkspace').then((m) => ({
    default: m.GraphicTextWorkspace,
  })),
)
const HighlightSetupPage = lazy(() =>
  import('./features/graphic-text/HighlightSetupPage').then((m) => ({
    default: m.HighlightSetupPage,
  })),
)
const DataAnalysisWorkspace = lazy(() =>
  import('./features/social-video/DataAnalysisWorkspace').then((m) => ({
    default: m.DataAnalysisWorkspace,
  })),
)
const TitleComposerPrototype = lazy(() =>
  import('./features/title-composer/TitleComposerPrototype').then((m) => ({
    default: m.TitleComposerPrototype,
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

function App() {
  const [mode, setMode] = useState<AppMode>(() => readAppTabFromSearch())
  const [highlightIds, setHighlightIds] = useState(() => readHighlightIdsFromSearch())
  const [titleText, setTitleText] = useState(() => readTitleTextFromSearch())
  const [balanceOpen, setBalanceOpen] = useState(false)
  const { theme, toggle } = useEraTheme()

  const syncFromUrl = useCallback(() => {
    setMode(readAppTabFromSearch())
    setHighlightIds(readHighlightIdsFromSearch())
    setTitleText(readTitleTextFromSearch())
  }, [])

  useEffect(() => {
    replaceAppTabInUrl(readAppTabFromSearch(), {
      ...readHighlightIdsFromSearch(),
      titleText: readTitleTextFromSearch(),
    })
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [syncFromUrl])

  const handleModeChange = useCallback(
    (next: AppMode) => {
      setBalanceOpen(false)
      setMode(next)
      replaceAppTabInUrl(next, {
        shareId: highlightIds.shareId,
        projectId: highlightIds.projectId,
        titleText,
      })
    },
    [highlightIds.projectId, highlightIds.shareId, titleText],
  )

  const wideLayout = mode === 'data' && !balanceOpen

  return (
    <div
      className={`relative mx-auto flex h-dvh w-full flex-col overflow-hidden ${
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
          backgroundColor: 'var(--era-header)',
        }}
      />
      {!balanceOpen ? (
        <header
          className="sticky top-0 z-40 flex shrink-0 items-center justify-center border-b px-4 py-2"
          style={{
            borderColor: 'var(--era-border)',
            background: 'var(--era-header)',
            paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
          }}
        >
          <TopModeTabs
            value={mode}
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
        ) : mode === 'data' ? (
          <DataAnalysisWorkspace />
        ) : mode === 'highlight' ? (
          highlightIds.shareId || highlightIds.projectId ? (
            <HighlightSetupPage
              key={`${highlightIds.shareId ?? ''}:${highlightIds.projectId ?? ''}`}
              shareId={highlightIds.shareId}
              projectId={highlightIds.projectId}
              embedded
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm font-medium">缺少 shareId 或 projectId</p>
              <p className="text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
                请使用：
                <span className="font-mono">
                  ?tab=highlight&amp;shareId=&lt;id&gt;
                </span>
              </p>
            </div>
          )
        ) : mode === 'title' ? (
          <TitleComposerPrototype
            key={titleText ?? ''}
            initialText={titleText}
          />
        ) : (
          <GraphicTextWorkspace />
        )}
      </Suspense>
    </div>
  )
}

export default App
