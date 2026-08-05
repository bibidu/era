import { ChevronLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
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
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack'
import {
  SocialVideoListPage,
  type SocialListWorkTypeFilter,
} from './SocialVideoListPage'
import { SocialVideoPostPage } from './SocialVideoPostPage'

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
  const [postId, setPostId] = useState<string | null>(() => readSocialPostIdFromSearch())
  const [postRecord, setPostRecord] = useState<SocialVideoAnalysisRecord | null>(null)
  const [postError, setPostError] = useState('')
  const [workTypeFilter, setWorkTypeFilter] = useState<SocialListWorkTypeFilter>('')

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
    setPostRecord(record)
    setPostError('')
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
        className={!showPostRoute ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
        aria-hidden={showPostRoute}
      >
        <SocialVideoListPage
          workTypeFilter={workTypeFilter}
          onWorkTypeFilterChange={setWorkTypeFilter}
          reloadToken={listReloadToken}
          onOpenPost={openPost}
        />
      </div>

      {showPostRoute ? (
        postError && !postRecord ? (
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
            flushTop
            onBack={closePost}
            onDeleted={bumpListReload}
            onUpdated={(next) => {
              if (next) setPostRecord(next)
              bumpListReload()
            }}
          />
        ) : (
          <SecondaryLoadingFallback />
        )
      ) : null}
    </div>
  )
}
