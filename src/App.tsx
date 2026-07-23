import { useState } from 'react'
import { TopModeTabs, type AppMode } from './components/TopModeTabs'
import { GraphicTextWorkspace } from './features/graphic-text/GraphicTextWorkspace'
import { PosterWorkspace } from './features/poster/PosterWorkspace'
import { SliceToolWorkspace } from './features/test/SliceToolWorkspace'
import { usePosterEditor } from './features/poster/usePosterEditor'

function App() {
  const [mode, setMode] = useState<AppMode>('graphic')
  const poster = usePosterEditor()

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
