import { ChevronLeft } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import {
  getSocialVideoAnalysis,
  type SocialVideoAnalysisRecord,
} from '../../agent/supabaseSocialVideoAnalysis'
import {
  ERA_URL_CHANGE_EVENT,
  pushSocialPostInUrl,
  readSocialPostIdFromSearch,
  replaceSocialPostInUrl,
} from '../../app/tabRouting'
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack'
import {
  SocialVideoListPage,
  type SocialListWorkTypeFilter,
} from './SocialVideoListPage'
import { SocialVideoPostPage } from './SocialVideoPostPage'

const SocialVideoCreatePage = lazy(() =>
  import('./SocialVideoCreatePage').then((m) => ({ default: m.SocialVideoCreatePage })),
)

export type { SocialListWorkTypeFilter }

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

function PostLoadErrorPage({
  message,
  onBack,
}: {
  message: string
  onBack: () => void
}) {
  const swipe = useEdgeSwipeBack(onBack)

  return (
    <div
      ref={swipe.ref}
      className="flex min-h-0 flex-1 flex-col"
      style={{ background: 'var(--era-bg)', color: 'var(--era-fg)', ...swipe.style }}
      onPointerDown={swipe.onPointerDown}
      onPointerMove={swipe.onPointerMove}
      onPointerUp={swipe.onPointerUp}
      onPointerCancel={swipe.onPointerCancel}
    >
      <header
        className="flex shrink-0 items-center gap-2 border-b px-3"
        style={{
          borderColor: 'var(--era-border)',
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '0.75rem',
          background: 'var(--era-header)',
        }}
      >
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full"
          style={{ background: 'var(--era-panel)' }}
          aria-label="返回"
          onClick={onBack}
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-base font-semibold">帖子详情</h1>
      </header>
      <div className="px-4 py-6 text-sm" style={{ color: 'var(--era-muted)' }}>
        {message}
      </div>
    </div>
  )
}

export function DataAnalysisWorkspace() {
  const [listReloadToken, setListReloadToken] = useState(0)
  const [creating, setCreating] = useState(false)
  const [postId, setPostId] = useState<string | null>(() => readSocialPostIdFromSearch())
  const [postRecord, setPostRecord] = useState<SocialVideoAnalysisRecord | null>(null)
  const [postError, setPostError] = useState('')
  const [workTypeFilter, setWorkTypeFilter] = useState<SocialListWorkTypeFilter>('')

  const bumpListReload = () => setListReloadToken((token) => token + 1)

  function openCreate() {
    setCreating(true)
  }

  function closeCreate() {
    setCreating(false)
  }

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
      setPostError('')
      return
    }

    let cancelled = false
    setPostError('')

    void (async () => {
      try {
        const full = await getSocialVideoAnalysis(postId)
        if (cancelled) return
        setPostRecord(full)
        setPostError('')
      } catch (err) {
        if (cancelled) return
        setPostError(err instanceof Error ? err.message : '加载帖子失败')
        setPostRecord((prev) => (prev?.id === postId ? prev : null))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [postId])

  function openPost(record: SocialVideoAnalysisRecord) {
    setCreating(false)
    setPostRecord(record)
    setPostError('')
    setPostId(record.id)
    pushSocialPostInUrl(record.id)
  }

  function closePost() {
    // 立刻卸叠层，并用 replace 清 URL。
    // 不用 history.back()：Safari 会恢复滚动/整页过渡，和手势叠层卸载叠在一起必抖。
    setPostId(null)
    replaceSocialPostInUrl(null)
  }

  const showPostRoute = Boolean(postId)
  const showCreateRoute = creating && !showPostRoute
  const listCovered = showPostRoute || showCreateRoute

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* 列表始终占位 flex-1，详情/创建叠层盖住；避免 absolute/relative 切换导致返回抖动 */}
      <div
        className="flex min-h-0 flex-1 flex-col"
        aria-hidden={listCovered}
        inert={listCovered || undefined}
        style={listCovered ? { pointerEvents: 'none' } : undefined}
      >
        <SocialVideoListPage
          workTypeFilter={workTypeFilter}
          onWorkTypeFilterChange={setWorkTypeFilter}
          reloadToken={listReloadToken}
          onOpenPost={openPost}
          onCreate={openCreate}
        />
      </div>

      {showCreateRoute ? (
        <div className="absolute inset-0 z-10 flex min-h-0 flex-col">
          <Suspense
            fallback={
              <div
                className="flex min-h-0 flex-1 flex-col"
                style={{ background: 'var(--era-bg)' }}
              >
                <SecondaryLoadingFallback />
              </div>
            }
          >
            <SocialVideoCreatePage
              onBack={closeCreate}
              onCreated={bumpListReload}
            />
          </Suspense>
        </div>
      ) : null}

      {showPostRoute ? (
        // 外层不铺底色：右滑时露出下方列表；底色由详情页自身承担
        <div className="absolute inset-0 z-10 flex min-h-0 flex-col">
          {postError && !postRecord ? (
            <PostLoadErrorPage
              message={postError}
              onBack={() => {
                replaceSocialPostInUrl(null)
                setPostId(null)
              }}
            />
          ) : postRecord ? (
            <SocialVideoPostPage
              key={postRecord.id}
              record={postRecord}
              onBack={closePost}
              onDeleted={bumpListReload}
              onUpdated={(next) => {
                if (next) setPostRecord(next)
                bumpListReload()
              }}
            />
          ) : (
            <div
              className="flex min-h-0 flex-1 flex-col"
              style={{ background: 'var(--era-bg)' }}
            >
              <SecondaryLoadingFallback />
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
