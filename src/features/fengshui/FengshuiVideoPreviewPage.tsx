import type { FengshuiVideoPreview } from './fengshuiVideoPreview'

export function FengshuiVideoPreviewPage({
  preview,
}: {
  preview: FengshuiVideoPreview | null
}) {
  if (!preview) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center"
        style={{ background: 'var(--era-bg)', color: 'var(--era-fg)' }}
      >
        <h1 className="text-base font-semibold">成片预览未绑定本次视频</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--era-muted)' }}>
          需要 ?tab=fengshui&v=日期目录/文件名.mp4，不能用裸根路径或通用社媒页代替。
        </p>
      </div>
    )
  }

  return (
    <main
      className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-5"
      style={{ background: '#0c1115', color: '#f4efe5' }}
    >
      <div className="w-full max-w-[430px]">
        <h1 className="mb-3 text-center text-lg font-semibold">{preview.title}</h1>
        <video
          className="aspect-[9/16] w-full rounded-2xl bg-black"
          controls
          playsInline
          preload="metadata"
          src={preview.src}
        />
      </div>
    </main>
  )
}
