import { useMemo, useState } from 'react'
import { readExportShareQuery, readHighlightSetupQuery } from './agent/agentHttp'
import { TopModeTabs, type AppMode } from './components/TopModeTabs'
import { GraphicTextWorkspace } from './features/graphic-text/GraphicTextWorkspace'
import { HighlightSetupPage } from './features/graphic-text/HighlightSetupPage'
import { DataAnalysisWorkspace } from './features/social-video/DataAnalysisWorkspace'
import { SocialVideoDataPage } from './features/social-video/SocialVideoDataPage'
import { useEraTheme } from './theme/useEraTheme'

function App() {
  const highlightSetup = useMemo(() => readHighlightSetupQuery(), [])
  const exportShare = useMemo(() => readExportShareQuery(), [])
  const socialVideoTool = useMemo(() => {
    return new URLSearchParams(window.location.search).get('tool') === 'social-video'
  }, [])
  const [mode, setMode] = useState<AppMode>('graphic')
  const { theme, toggle } = useEraTheme()

  if (socialVideoTool) {
    return <SocialVideoDataPage />
  }

  if (exportShare.enabled && exportShare.shareId) {
    const target = new URL('gallery/', window.location.href)
    target.searchParams.set('shareId', exportShare.shareId)
    window.location.replace(target.toString())
    return (
      <div className="mx-auto flex h-dvh w-full max-w-lg items-center justify-center bg-white text-sm text-neutral-500">
        正在跳转到图文库…
      </div>
    )
  }

  if (highlightSetup.enabled) {
    if (!highlightSetup.shareId && !highlightSetup.projectId) {
      return (
        <div className="mx-auto flex h-dvh w-full max-w-lg flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium">缺少 shareId 或 projectId</p>
          <p className="text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
            云端请使用：
            <span className="font-mono">
              https://bibidu-era-0tdhv043.edgeone.cool/?highlightSetup=1&amp;shareId=&lt;id&gt;
            </span>
          </p>
        </div>
      )
    }
    return (
      <HighlightSetupPage
        shareId={highlightSetup.shareId}
        projectId={highlightSetup.projectId}
      />
    )
  }

  return (
    <div
      className={`relative mx-auto flex h-dvh w-full flex-col overflow-hidden ${
        mode === 'data' ? 'max-w-5xl' : 'max-w-lg'
      }`}
      style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}
    >
      {/* Safari 26+ samples fixed edge backgrounds for toolbar tint. */}
      <div
        id="era-safari-tint"
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[10000]"
        style={{
          height: 'max(8px, env(safe-area-inset-top, 0px))',
          backgroundColor: 'var(--era-header)',
        }}
      />
      <header
        className="sticky top-0 z-40 flex shrink-0 items-center justify-center border-b px-4 py-2"
        style={{
          borderColor: 'var(--era-border)',
          background: 'var(--era-header)',
          paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <TopModeTabs value={mode} onChange={setMode} theme={theme} onToggleTheme={toggle} />
      </header>

      {mode === 'data' ? (
        <DataAnalysisWorkspace />
      ) : (
        <GraphicTextWorkspace />
      )}
    </div>
  )
}

export default App
