import { ChevronLeft } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { type SocialVideoAnalysisRecord } from '../../agent/supabaseSocialVideoAnalysis'
import {
  SocialVideoListPage,
  type SocialListStatusFilter,
  type SocialListWorkTypeFilter,
} from './SocialVideoListPage'

export type { SocialListStatusFilter, SocialListWorkTypeFilter }

const AccountReviewPage = lazy(() =>
  import('./AccountReviewPage').then((m) => ({ default: m.AccountReviewPage })),
)
const SocialVideoCreatePage = lazy(() =>
  import('./SocialVideoCreatePage').then((m) => ({ default: m.SocialVideoCreatePage })),
)
const SocialVideoDataPage = lazy(() =>
  import('./SocialVideoDataPage').then((m) => ({ default: m.SocialVideoDataPage })),
)
const SocialVideoDetailPage = lazy(() =>
  import('./SocialVideoDetailPage').then((m) => ({ default: m.SocialVideoDetailPage })),
)

function SecondaryLoadingFallback() {
  return (
    <div
      className="flex min-h-0 flex-1 items-center justify-center text-sm"
      style={{ color: 'var(--era-muted)' }}
    >
      加载中...
    </div>
  )
}

export function DataAnalysisWorkspace() {
  const [view, setView] = useState<'list' | 'extract' | 'review' | 'create' | 'detail'>('list')
  const [listReloadToken, setListReloadToken] = useState(0)
  const [editingRecord, setEditingRecord] = useState<SocialVideoAnalysisRecord | null>(null)
  const [detailRecord, setDetailRecord] = useState<SocialVideoAnalysisRecord | null>(null)
  const [statusFilter, setStatusFilter] = useState<SocialListStatusFilter>('')
  const [workTypeFilter, setWorkTypeFilter] = useState<SocialListWorkTypeFilter>('')

  const bumpListReload = () => setListReloadToken((token) => token + 1)

  // 列表保持挂载：从二级页返回不重挂载、不重新请求；删除/保存等再 bump reloadToken
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className={view === 'list' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
        aria-hidden={view !== 'list'}
      >
        <SocialVideoListPage
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          workTypeFilter={workTypeFilter}
          onWorkTypeFilterChange={setWorkTypeFilter}
          reloadToken={listReloadToken}
          onSmartExtract={() => setView('extract')}
          onOpenReview={() => setView('review')}
          onCreate={() => {
            setEditingRecord(null)
            setView('create')
          }}
          onEdit={(record) => {
            setEditingRecord(record)
            setView('create')
          }}
          onOpenDetail={(record) => {
            setDetailRecord(record)
            setView('detail')
          }}
        />
      </div>

      {view === 'extract' ? (
        <div
          className="flex min-h-0 flex-1 flex-col"
          style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}
        >
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
          <Suspense fallback={<SecondaryLoadingFallback />}>
            <SocialVideoDataPage
              embedded
              onSaved={() => {
                bumpListReload()
                setView('list')
              }}
            />
          </Suspense>
        </div>
      ) : null}

      {view === 'review' ? (
        <Suspense fallback={<SecondaryLoadingFallback />}>
          <AccountReviewPage onBack={() => setView('list')} />
        </Suspense>
      ) : null}

      {view === 'detail' && detailRecord ? (
        <Suspense fallback={<SecondaryLoadingFallback />}>
          <SocialVideoDetailPage
            record={detailRecord}
            onBack={() => {
              setDetailRecord(null)
              setView('list')
            }}
            onDeleted={bumpListReload}
          />
        </Suspense>
      ) : null}

      {view === 'create' ? (
        <Suspense fallback={<SecondaryLoadingFallback />}>
          <SocialVideoCreatePage
            editingRecord={editingRecord}
            onBack={() => {
              setEditingRecord(null)
              setView('list')
            }}
            onCreated={bumpListReload}
            onDeleted={bumpListReload}
          />
        </Suspense>
      ) : null}
    </div>
  )
}
