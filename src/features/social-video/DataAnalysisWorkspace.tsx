import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { SocialVideoDataPage } from './SocialVideoDataPage'
import { SocialVideoListPage } from './SocialVideoListPage'

export function DataAnalysisWorkspace() {
  const [view, setView] = useState<'extract' | 'list'>('extract')

  if (view === 'list') {
    return <SocialVideoListPage onBack={() => setView('extract')} />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}>
      <header
        className="flex shrink-0 items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--era-border)' }}
      >
        <p className="text-base font-semibold">社媒数据提取</p>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition hover:opacity-90"
          style={{ borderColor: 'var(--era-border)' }}
          onClick={() => setView('list')}
        >
          分析列表
          <ChevronRight size={16} />
        </button>
      </header>
      <SocialVideoDataPage embedded />
    </div>
  )
}
