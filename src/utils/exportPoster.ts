import html2canvas from 'html2canvas'

export async function exportPosterToImage(canvasEl: HTMLElement): Promise<Blob> {
  await document.fonts.ready
  await new Promise((r) => setTimeout(r, 150))

  const canvas = await html2canvas(canvasEl, {
    useCORS: true,
    allowTaint: true,
    scale: 2,
    backgroundColor: null,
    logging: false,
    ignoreElements: (el) => el.classList.contains('export-hide'),
  })

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png', 1)
  })

  if (!blob) throw new Error('导出失败')
  return blob
}

export async function savePosterBlob(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '海报' })
      return
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  setTimeout(() => URL.revokeObjectURL(url), 3000)

  // 移动端兜底：部分浏览器不支持 download
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    const win = window.open(url, '_blank')
    if (!win) {
      const img = new Image()
      img.src = url
      const w = window.open('')
      w?.document.write(`<img src="${url}" style="width:100%" />`)
    }
  }
}
