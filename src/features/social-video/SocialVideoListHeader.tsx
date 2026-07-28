import type { SocialVideoAnalysisRecord } from '../../agent/supabaseSocialVideoAnalysis'

interface SocialVideoListHeaderProps {
  records: SocialVideoAnalysisRecord[]
  onSelect: (record: SocialVideoAnalysisRecord) => void
}

export function SocialVideoListHeader({ records, onSelect }: SocialVideoListHeaderProps) {
  if (records.length === 0) {
    return (
      <section className="shrink-0 border-b border-white/10 bg-neutral-950 px-4 py-3">
        <p className="text-sm text-neutral-400">暂无已保存作品，提取并保存后会显示在这里。</p>
      </section>
    )
  }

  return (
    <section className="shrink-0 border-b border-white/10 bg-neutral-950 px-4 py-3">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {records.map((record) => (
          <button
            key={record.id}
            type="button"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 text-left shadow-sm transition hover:border-white/20"
            onClick={() => onSelect(record)}
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
    </section>
  )
}
