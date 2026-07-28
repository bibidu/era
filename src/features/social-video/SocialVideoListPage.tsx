import { ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  listSocialVideoAnalyses,
  sortSocialVideoAnalyses,
  type SocialVideoAnalysisRecord,
} from '../../agent/supabaseSocialVideoAnalysis'
import { SocialVideoDetailSheet } from './SocialVideoDetailSheet'

interface SocialVideoListPageProps {
  onBack: () => void
}

export function SocialVideoListPage({ onBack }: SocialVideoListPageProps) {
  const [records, setRecords] = useState<SocialVideoAnalysisRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<SocialVideoAnalysisRecord | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setLoading(true)
      try {
        const rows = await listSocialVideoAnalyses()
        if (cancelled) return
        setRecords(sortSocialVideoAnalyses(rows))
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '加载作品列表失败')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-950 text-neutral-100">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-3">
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="返回"
          onClick={onBack}
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-white">分析列表</h1>
          <p className="text-xs text-neutral-400">发布越早越靠后</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-neutral-400">加载中...</div>
        ) : error ? (
          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 px-4 py-6 text-sm leading-6 text-amber-100">
            {error}
          </div>
        ) : records.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-6 text-center">
            <p className="text-base font-semibold text-white">暂无分析作品</p>
            <p className="mt-2 text-sm leading-6 text-neutral-400">提取完成后保存，作品会出现在这里。</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {records.map((record) => (
              <button
                key={record.id}
                type="button"
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 text-left shadow-sm transition hover:border-white/20"
                onClick={() => {
                  setSelectedRecord(record)
                  setSheetOpen(true)
                }}
              >
                <div className="aspect-[3/4] w-full">
                  {record.cover_url ? (
                    <img
                      src={record.cover_url}
                      alt={record.title || '作品封面'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 px-3 text-center text-sm font-medium text-neutral-300">
                      {record.title || '未命名作品'}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-2 pb-2 pt-10">
                    <p className="line-clamp-2 text-xs font-semibold leading-4 text-white sm:text-sm">
                      {record.title || '未命名作品'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <SocialVideoDetailSheet
        record={selectedRecord}
        isOpen={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
