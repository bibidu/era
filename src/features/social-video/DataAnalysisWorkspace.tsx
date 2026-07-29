import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { SocialVideoDataPage } from './SocialVideoDataPage'
import { SocialVideoListPage } from './SocialVideoListPage'

export function DataAnalysisWorkspace() {
  const [view, setView] = useState<'list' | 'extract'>('list')

  if (view === 'extract') {
    return (
      <div className="flex min-h-0 flex-1 flex-col" style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}>
        <header
          className="flex shrink-0 items-center gap-2 border-b px-3 py-3"
          style={{ borderColor: 'var(--era-border)' }}
        >
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full"
            style={{ background: 'var(--era-panel)' }}
            aria-label="返回"
            onClick={() => setView('list')}
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-base font-semibold">智能提取</h1>
        </header>
        <SocialVideoDataPage embedded />
      </div>
    )
  }

  return <SocialVideoListPage onSmartExtract={() => setView('extract')} />
}
