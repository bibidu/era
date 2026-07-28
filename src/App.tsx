import { useMemo, useState } from 'react'
import { readHighlightSetupQuery } from './agent/agentHttp'
import { TopModeTabs, type AppMode } from './components/TopModeTabs'
import { GraphicTextWorkspace } from './features/graphic-text/GraphicTextWorkspace'
import { HighlightSetupPage } from './features/graphic-text/HighlightSetupPage'
import { DataAnalysisWorkspace } from './features/social-video/DataAnalysisWorkspace'
import { SocialVideoDataPage } from './features/social-video/SocialVideoDataPage'

function App() {
  const highlightSetup = useMemo(() => readHighlightSetupQuery(), [])
  const socialVideoTool = useMemo(() => {
    return new URLSearchParams(window.location.search).get('tool') === 'social-video'
  }, [])
  const [mode, setMode] = useState<AppMode>('graphic')

  if (socialVideoTool) {
    return <SocialVideoDataPage />
  }

  if (highlightSetup.enabled) {
    if (!highlightSetup.shareId && !highlightSetup.projectId) {
      return (
        <div className="mx-auto flex h-dvh w-full max-w-lg flex-col items-center justify-center gap-2 bg-white px-6 text-center">
          <p className="text-sm font-medium text-neutral-900">缺少 shareId 或 projectId</p>
          <p className="text-xs leading-5 text-neutral-500">
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
      className={`mx-auto flex h-dvh w-full flex-col overflow-hidden bg-white ${
        mode === 'data' ? 'max-w-5xl' : 'max-w-lg'
      }`}
    >
      <header className="flex shrink-0 items-center justify-center border-b border-neutral-200 px-4 py-2">
        <TopModeTabs value={mode} onChange={setMode} />
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
