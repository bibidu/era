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
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-950">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-base font-semibold text-white">社媒数据提取</p>
          <p className="text-xs text-neutral-400">提取后可保存到分析列表</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
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
