import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import type { SocialVideoAnalysisRecord } from '../../agent/supabaseSocialVideoAnalysis'
import { SocialVideoBoardPage } from './SocialVideoBoardPage'
import { SocialVideoCreatePage } from './SocialVideoCreatePage'
import { SocialVideoDataPage } from './SocialVideoDataPage'
import { SocialVideoListPage } from './SocialVideoListPage'

export function DataAnalysisWorkspace() {
  const [view, setView] = useState<'list' | 'extract' | 'board' | 'create'>('list')
  const [listReloadToken, setListReloadToken] = useState(0)
  const [editingRecord, setEditingRecord] = useState<SocialVideoAnalysisRecord | null>(null)

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

  if (view === 'board') {
    return <SocialVideoBoardPage onBack={() => setView('list')} />
  }

  if (view === 'create') {
    return (
      <SocialVideoCreatePage
        editingRecord={editingRecord}
        onBack={() => {
          setEditingRecord(null)
          setView('list')
        }}
        onCreated={() => setListReloadToken((token) => token + 1)}
      />
    )
  }

  return (
    <SocialVideoListPage
      key={listReloadToken}
      onSmartExtract={() => setView('extract')}
      onOpenBoard={() => setView('board')}
      onCreate={() => {
        setEditingRecord(null)
        setView('create')
      }}
      onEdit={(record) => {
        setEditingRecord(record)
        setView('create')
      }}
    />
  )
}
