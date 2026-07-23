/** 测试 Tab：嵌入手动图片切割工具（GitHub Pages / 本地均可） */
export function SliceToolWorkspace() {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  const src = `${normalized}slice-tool/`

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-50">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2">
        <div>
          <p className="text-sm font-medium text-neutral-900">图片手动切割</p>
          <p className="text-xs text-neutral-500">在图上框选区域后导出 PNG，不改原图像素</p>
        </div>
        <a
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          href={src}
          target="_blank"
          rel="noreferrer"
        >
          新窗口打开
        </a>
      </div>
      <iframe
        title="图片手动切割工具"
        src={src}
        className="min-h-0 w-full flex-1 border-0 bg-[#0f1115]"
      />
    </div>
  )
}
