import { useMemo, useState } from 'react'
import { readExportShareQuery, readHighlightSetupQuery } from './agent/agentHttp'
import { TopModeTabs, type AppMode } from './components/TopModeTabs'
import { GraphicTextWorkspace } from './features/graphic-text/GraphicTextWorkspace'
import { HighlightSetupPage } from './features/graphic-text/HighlightSetupPage'
import { PosterWorkspace } from './features/poster/PosterWorkspace'
import { usePosterEditor } from './features/poster/usePosterEditor'

function App() {
  const highlightSetup = useMemo(() => readHighlightSetupQuery(), [])
  const exportShare = useMemo(() => readExportShareQuery(), [])
  const [mode, setMode] = useState<AppMode>('graphic')
  const poster = usePosterEditor()

  if (exportShare.enabled && exportShare.shareId) {
    const target = new URL('gallery/', window.location.href)
    target.searchParams.set('tab', 'preview')
    target.searchParams.set('shareId', exportShare.shareId)
    window.location.replace(target.toString())
    return (
      <div className="mx-auto flex h-dvh w-full max-w-lg items-center justify-center bg-white text-sm text-neutral-500">
        正在跳转到图片预览…
      </div>
    )
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
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden bg-white">
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
      ) : (
        <GraphicTextWorkspace defaultBackgroundUrl={poster.posterUrl} />
      )}
    </div>
  )
}

export default App
