import { useMemo, useState } from 'react'
import { readHighlightSetupQuery } from './agent/agentHttp'
import { TopModeTabs, type AppMode } from './components/TopModeTabs'
import { GraphicTextWorkspace } from './features/graphic-text/GraphicTextWorkspace'
import { HighlightSetupPage } from './features/graphic-text/HighlightSetupPage'
import { PosterWorkspace } from './features/poster/PosterWorkspace'
import { SocialVideoDataPage } from './features/social-video/SocialVideoDataPage'
import { SliceToolWorkspace } from './features/test/SliceToolWorkspace'
import { usePosterEditor } from './features/poster/usePosterEditor'

function App() {
  const highlightSetup = useMemo(() => readHighlightSetupQuery(), [])
  const socialVideoTool = useMemo(() => {
    return new URLSearchParams(window.location.search).get('tool') === 'social-video'
  }, [])
  const [mode, setMode] = useState<AppMode>('graphic')
  const poster = usePosterEditor()

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
        mode === 'test' ? 'max-w-6xl' : 'max-w-lg'
      }`}
    >
      <header className="flex shrink-0 items-center justify-center border-b border-neutral-200 px-4 py-2">
        <TopModeTabs
          value={mode}
          onChange={(nextMode) => {
            setMode(nextMode)
            poster.closeOverlays()
          }}
        />
      </header>

      {mode === 'poster' ? (
        <PosterWorkspace editor={poster} />
      ) : mode === 'test' ? (
        <SliceToolWorkspace />
      ) : (
        <GraphicTextWorkspace defaultBackgroundUrl={poster.posterUrl} />
      )}
    </div>
  )
}

export default App
