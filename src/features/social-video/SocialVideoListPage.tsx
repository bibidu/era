import { useEffect, useState } from 'react'
import {
  listSocialVideoAnalyses,
  sortSocialVideoAnalyses,
  type SocialVideoAnalysisRecord,
} from '../../agent/supabaseSocialVideoAnalysis'
import { SocialVideoDetailSheet } from './SocialVideoDetailSheet'

interface SocialVideoListPageProps {
  onSmartExtract: () => void
}

export function SocialVideoListPage({ onSmartExtract }: SocialVideoListPageProps) {
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
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}>
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: 'var(--era-border)' }}
      >
        <h1 className="text-base font-semibold">分析列表</h1>
        <button
          type="button"
          className="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition hover:opacity-90"
          style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
          onClick={onSmartExtract}
        >
          智能提取
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm" style={{ color: 'var(--era-muted)' }}>
            加载中...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 px-4 py-6 text-sm leading-6 text-amber-100">
            {error}
          </div>
        ) : records.length === 0 ? (
          <div
            className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed px-6 text-center"
            style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
          >
            <p className="text-base font-semibold">暂无分析作品</p>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--era-muted)' }}>
              点击右上角「智能提取」，完成后保存，作品会出现在这里。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {records.map((record) => (
              <button
                key={record.id}
                type="button"
                className="group relative overflow-hidden rounded-2xl border text-left shadow-sm transition hover:opacity-95"
                style={{ borderColor: 'var(--era-border)', background: 'var(--era-panel)' }}
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
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center px-3 text-center text-sm font-medium"
                      style={{ color: 'var(--era-muted)' }}
                    >
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
