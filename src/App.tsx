import { useState } from 'react'
import { TopModeTabs, type AppMode } from './components/TopModeTabs'
import { GraphicTextWorkspace } from './features/graphic-text/GraphicTextWorkspace'
import { PosterWorkspace } from './features/poster/PosterWorkspace'
import { usePosterEditor } from './features/poster/usePosterEditor'

function App() {
  const [mode, setMode] = useState<AppMode>('graphic')
  const poster = usePosterEditor()

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
