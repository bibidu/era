import { useMemo, useState } from 'react'
import { readHighlightSetupQuery } from './agent/agentHttp'
import { TopModeTabs, type AppMode } from './components/TopModeTabs'
import { GraphicTextWorkspace } from './features/graphic-text/GraphicTextWorkspace'
import { HighlightSetupPage } from './features/graphic-text/HighlightSetupPage'
import { DataAnalysisWorkspace } from './features/social-video/DataAnalysisWorkspace'
import { SocialVideoDataPage } from './features/social-video/SocialVideoDataPage'
import { useEraTheme } from './theme/useEraTheme'

function App() {
  const highlightSetup = useMemo(() => readHighlightSetupQuery(), [])
  const socialVideoTool = useMemo(() => {
    return new URLSearchParams(window.location.search).get('tool') === 'social-video'
  }, [])
  const [mode, setMode] = useState<AppMode>('graphic')
  const { theme, toggle } = useEraTheme()

  if (socialVideoTool) {
    return <SocialVideoDataPage />
  }

  if (highlightSetup.enabled) {
    if (!highlightSetup.shareId && !highlightSetup.projectId) {
      return (
        <div className="mx-auto flex h-dvh w-full max-w-lg flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium">缺少 shareId 或 projectId</p>
          <p className="text-xs leading-5" style={{ color: 'var(--era-muted)' }}>
            云端请使用：
            <span className="font-mono">
              https://bibidu.github.io/era/?highlightSetup=1&amp;shareId=&lt;id&gt;
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
      className={`mx-auto flex h-dvh w-full flex-col overflow-hidden ${
        mode === 'data' ? 'max-w-5xl' : 'max-w-lg'
      }`}
      style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}
    >
      <header
        className="flex shrink-0 items-center justify-center border-b px-4 py-2"
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
