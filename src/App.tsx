import { useMemo, useState } from 'react'
import { readHighlightSetupQuery } from './agent/agentHttp'
import { TopModeTabs, type AppMode } from './components/TopModeTabs'
import { GraphicTextWorkspace } from './features/graphic-text/GraphicTextWorkspace'
import { HighlightSetupPage } from './features/graphic-text/HighlightSetupPage'
import { PosterWorkspace } from './features/poster/PosterWorkspace'
import { SliceToolWorkspace } from './features/test/SliceToolWorkspace'
import { usePosterEditor } from './features/poster/usePosterEditor'

function App() {
  const highlightSetup = useMemo(() => readHighlightSetupQuery(), [])
  const [mode, setMode] = useState<AppMode>('graphic')
  const poster = usePosterEditor()

  if (highlightSetup.enabled) {
    if (!highlightSetup.projectId) {
      return (
        <div className="mx-auto flex h-dvh w-full max-w-lg flex-col items-center justify-center gap-2 bg-white px-6 text-center">
          <p className="text-sm font-medium text-neutral-900">缺少 projectId</p>
          <p className="text-xs leading-5 text-neutral-500">
            请使用链接格式：
            <span className="font-mono">/era/?highlightSetup=1&amp;projectId=&lt;id&gt;</span>
          </p>
        </div>
      )
    }
    return <HighlightSetupPage projectId={highlightSetup.projectId} />
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
