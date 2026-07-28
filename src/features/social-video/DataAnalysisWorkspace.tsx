import { useCallback, useEffect, useState } from 'react'
import {
  listSocialVideoAnalyses,
  sortSocialVideoAnalyses,
  type SocialVideoAnalysisRecord,
} from '../../agent/supabaseSocialVideoAnalysis'
import { SocialVideoDataPage } from './SocialVideoDataPage'
import { SocialVideoDetailSheet } from './SocialVideoDetailSheet'
import { SocialVideoListHeader } from './SocialVideoListHeader'

export function DataAnalysisWorkspace() {
  const [records, setRecords] = useState<SocialVideoAnalysisRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<SocialVideoAnalysisRecord | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [listError, setListError] = useState('')

  const refreshRecords = useCallback(async () => {
    try {
      const rows = await listSocialVideoAnalyses()
      setRecords(sortSocialVideoAnalyses(rows))
      setListError('')
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载作品列表失败'
      setListError(message)
    }
  }, [])

  useEffect(() => {
    void refreshRecords()
  }, [refreshRecords])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-950">
      <SocialVideoListHeader
        records={records}
        onSelect={(record) => {
          setSelectedRecord(record)
          setSheetOpen(true)
        }}
      />
      {listError ? (
        <p className="shrink-0 border-b border-white/10 px-4 py-2 text-xs text-amber-200">{listError}</p>
      ) : null}
      <SocialVideoDataPage embedded onSaved={refreshRecords} />
      <SocialVideoDetailSheet
        record={selectedRecord}
        isOpen={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
