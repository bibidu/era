import { ChevronLeft } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import {
  getSocialVideoAnalysis,
  type SocialVideoAnalysisRecord,
} from '../../agent/supabaseSocialVideoAnalysis'
import {
  ERA_URL_CHANGE_EVENT,
  navigateBackFromSocialPost,
  pushSocialPostInUrl,
  readSocialPostIdFromSearch,
  replaceSocialPostInUrl,
} from '../../app/tabRouting'
import {
  SocialVideoListPage,
  type SocialListWorkTypeFilter,
} from './SocialVideoListPage'

export type { SocialListWorkTypeFilter }

const AccountReviewPage = lazy(() =>
  import('./AccountReviewPage').then((m) => ({ default: m.AccountReviewPage })),
)
const SocialVideoDataPage = lazy(() =>
  import('./SocialVideoDataPage').then((m) => ({ default: m.SocialVideoDataPage })),
)
const SocialVideoPostPage = lazy(() =>
  import('./SocialVideoPostPage').then((m) => ({ default: m.SocialVideoPostPage })),
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

type LocalView = 'list' | 'extract' | 'review'

export function DataAnalysisWorkspace() {
  const [localView, setLocalView] = useState<LocalView>('list')
  const [listReloadToken, setListReloadToken] = useState(0)
  const [postId, setPostId] = useState<string | null>(() => readSocialPostIdFromSearch())
  const [postRecord, setPostRecord] = useState<SocialVideoAnalysisRecord | null>(null)
  const [postLoading, setPostLoading] = useState(false)
  const [postError, setPostError] = useState('')
  const [workTypeFilter, setWorkTypeFilter] = useState<SocialListWorkTypeFilter>('')
  const [extractTaskApi, setExtractTaskApi] = useState<{
    run: () => void
    busy: boolean
  } | null>(null)

  const bumpListReload = () => setListReloadToken((token) => token + 1)

  const syncPostFromUrl = useCallback(() => {
    setPostId(readSocialPostIdFromSearch())
  }, [])

  useEffect(() => {
    window.addEventListener('popstate', syncPostFromUrl)
    window.addEventListener(ERA_URL_CHANGE_EVENT, syncPostFromUrl)
    return () => {
      window.removeEventListener('popstate', syncPostFromUrl)
      window.removeEventListener(ERA_URL_CHANGE_EVENT, syncPostFromUrl)
    }
  }, [syncPostFromUrl])

  useEffect(() => {
    if (!postId) {
      setPostRecord(null)
      setPostLoading(false)
      setPostError('')
      return
    }

    let cancelled = false
    setPostLoading(true)
    setPostError('')
    setLocalView('list')

    void (async () => {
      try {
        const full = await getSocialVideoAnalysis(postId)
        if (cancelled) return
        setPostRecord(full)
        setPostError('')
      } catch (err) {
        if (cancelled) return
        setPostRecord(null)
        setPostError(err instanceof Error ? err.message : '加载帖子失败')
      } finally {
        if (!cancelled) setPostLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [postId])

  function openPost(record: SocialVideoAnalysisRecord) {
    setPostRecord(record)
    setPostId(record.id)
    pushSocialPostInUrl(record.id)
  }

  function closePost() {
    navigateBackFromSocialPost()
    if (!readSocialPostIdFromSearch()) {
      setPostId(null)
    }
  }

  const showPostRoute = Boolean(postId)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className={localView === 'list' && !showPostRoute ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
        aria-hidden={localView !== 'list' || showPostRoute}
      >
        <SocialVideoListPage
          workTypeFilter={workTypeFilter}
          onWorkTypeFilterChange={setWorkTypeFilter}
          reloadToken={listReloadToken}
          onSmartExtract={() => setLocalView('extract')}
          onOpenReview={() => setLocalView('review')}
          onOpenPost={openPost}
        />
      </div>

      {localView === 'extract' && !showPostRoute ? (
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
              onClick={() => setLocalView('list')}
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="min-w-0 flex-1 text-base font-semibold">智能提取</h1>
            <button
              type="button"
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                borderColor: 'var(--era-border)',
                background: 'var(--era-button)',
                color: 'var(--era-button-fg)',
              }}
              disabled={!extractTaskApi || extractTaskApi.busy}
              onClick={() => extractTaskApi?.run()}
            >
              {extractTaskApi?.busy ? '创建中...' : '创建任务'}
            </button>
          </header>
          <Suspense fallback={<SecondaryLoadingFallback />}>
            <SocialVideoDataPage
              embedded
              onCreateTaskReady={setExtractTaskApi}
              onTaskCreated={() => {
                bumpListReload()
                setLocalView('list')
              }}
            />
          </Suspense>
        </div>
      ) : null}

      {localView === 'review' && !showPostRoute ? (
        <Suspense fallback={<SecondaryLoadingFallback />}>
          <AccountReviewPage onBack={() => setLocalView('list')} />
        </Suspense>
      ) : null}

      {showPostRoute ? (
        <Suspense fallback={<SecondaryLoadingFallback />}>
          {postLoading && !postRecord ? (
            <SecondaryLoadingFallback />
          ) : postError && !postRecord ? (
            <div
              className="flex min-h-0 flex-1 flex-col"
              style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}
            >
              <header
                className="flex shrink-0 items-center gap-2 border-b px-3"
                style={{
                  borderColor: 'var(--era-border)',
                  paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
                  paddingBottom: '0.75rem',
                }}
              >
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-full"
                  style={{ background: 'var(--era-panel)' }}
                  aria-label="返回"
                  onClick={() => {
                    replaceSocialPostInUrl(null)
                    setPostId(null)
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <h1 className="text-base font-semibold">帖子详情</h1>
              </header>
              <div className="px-4 py-6 text-sm" style={{ color: 'var(--era-muted)' }}>
                {postError}
              </div>
            </div>
          ) : postRecord ? (
            <SocialVideoPostPage
              record={postRecord}
              flushTop
              onBack={closePost}
              onDeleted={bumpListReload}
              onUpdated={bumpListReload}
            />
          ) : (
            <SecondaryLoadingFallback />
          )}
        </Suspense>
      ) : null}
    </div>
  )
}
