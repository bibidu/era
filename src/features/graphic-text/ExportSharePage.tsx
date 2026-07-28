import { Download, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  fetchExportShare,
  type ExportShareImage,
  type ExportShareRecord,
} from '../../agent/supabaseHighlightSetup'

function downloadDataUrl(name: string, dataUrl: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function ExportSharePage({ shareId }: { shareId?: string | null }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<ExportShareRecord | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)

  const load = useCallback(async () => {
    if (!shareId) {
      setError('缺少 shareId')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setRecord(await fetchExportShare(shareId))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [shareId])

  useEffect(() => {
    void load()
  }, [load])

  const pages: ExportShareImage[] = record?.images ?? []
  const hasCover = pages[0]?.name === 'cover.png'

  const handleDownloadAll = useCallback(async () => {
    const list = pages
    if (!list.length) return
    setDownloadingAll(true)
    try {
      for (let index = 0; index < list.length; index += 1) {
        downloadDataUrl(list[index].name, list[index].dataUrl)
        // 逐个触发，间隔避免浏览器拦截批量下载
        await wait(400)
      }
    } finally {
      setDownloadingAll(false)
    }
  }, [pages])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 bg-neutral-100 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-base font-semibold text-neutral-900">
          {record?.title?.trim() || 'Era 导出图'}
        </h1>
        <p className="text-xs leading-5 text-neutral-500">
          在线预览下方每一页，点击「下载」保存原图；或点右上角「下载全部」。
          {record?.aspect_ratio ? ` 画幅 ${record.aspect_ratio}。` : ''}
        </p>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-500">
          <LoaderCircle className="size-4 animate-spin" /> 加载中…
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            重试
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">共 {pages.length} 页</span>
            <button
              type="button"
              onClick={() => void handleDownloadAll()}
              disabled={downloadingAll || !pages.length}
              className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {downloadingAll ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              下载全部
            </button>
          </div>

          {record?.sheet ? (
            <figure className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3">
              <figcaption className="flex items-center justify-between text-xs text-neutral-500">
                <span>横版总览拼图</span>
                <button
                  type="button"
                  onClick={() => downloadDataUrl(record.sheet!.name, record.sheet!.dataUrl)}
                  className="inline-flex items-center gap-1 text-neutral-700 hover:text-neutral-900"
                >
                  <Download className="size-3.5" /> 下载
                </button>
              </figcaption>
              <img
                src={record.sheet.dataUrl}
                alt="review sheet"
                className="w-full rounded"
              />
            </figure>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pages.map((image, index) => (
              <figure
                key={`${image.name}-${index}`}
                className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3"
              >
                <figcaption className="flex items-center justify-between text-xs text-neutral-500">
                  <span>
                    {hasCover && index === 0 ? '封面' : `第 ${hasCover ? index : index + 1} 页`}
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadDataUrl(image.name, image.dataUrl)}
                    className="inline-flex items-center gap-1 text-neutral-700 hover:text-neutral-900"
                  >
                    <Download className="size-3.5" /> 下载
                  </button>
                </figcaption>
                <img src={image.dataUrl} alt={image.name} className="w-full rounded" />
              </figure>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
