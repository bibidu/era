import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFile } from 'fs/promises'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, '../dist')
const basePath = '/era'

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
}

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const url = req.url ?? '/'
        const path = url.startsWith(basePath) ? url.slice(basePath.length) || '/index.html' : url
        const filePath = join(distDir, path === '/' ? 'index.html' : path)
        const data = await readFile(filePath)
        const ext = extname(filePath)
        res.writeHead(200, {
          'Content-Type': mime[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(data)
      } catch {
        res.writeHead(404)
        res.end('not found')
      }
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve({ server, port })
    })
  })
}

function md5(buf) {
  return createHash('md5').update(buf).digest('hex')
}

async function main() {
  const { server, port } = await startServer()
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 500, height: 200 } })
  const base = `http://127.0.0.1:${port}${basePath}/`

  try {
    await page.setContent('<html><body style="margin:0;background:#fff"></body></html>')

    const result = await page.evaluate(async (origin) => {
      const css = `
@font-face {
  font-family: 'EraPixel12';
  src: url('${origin}fonts/pixel/fusion-pixel-12px-proportional-zh_hans.otf.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'EraPixel12';
  src: url('${origin}fonts/pixel/fusion-pixel-12px-proportional-latin.otf.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}`
      const style = document.createElement('style')
      style.id = 'pixel-font-fusion-pixel-12'
      style.textContent = css
      document.head.appendChild(style)
      await document.fonts.load("48px 'EraPixel12'")
      await document.fonts.ready

      const mk = (id, family, text) => {
        const div = document.createElement('div')
        div.id = id
        div.style.fontFamily = family
        div.style.fontSize = '48px'
        div.style.lineHeight = '1'
        div.style.color = '#000'
        div.textContent = text
        document.body.appendChild(div)
      }
      mk('pixel', "'EraPixel12', monospace", '像素文字ABC')
      mk('mono', 'monospace', '像素文字ABC')

      return {
        chineseOk: document.fonts.check("48px 'EraPixel12'", '像素'),
        pixelFamily: getComputedStyle(document.getElementById('pixel')).fontFamily,
      }
    }, base)

    await page.waitForTimeout(200)
    const pixelShot = await page.locator('#pixel').screenshot()
    const monoShot = await page.locator('#mono').screenshot()
    const pixelHash = md5(pixelShot)
    const monoHash = md5(monoShot)

    console.log('像素字体验证结果:', JSON.stringify({
      ...result,
      pixelHash,
      monoHash,
      visuallyDifferent: pixelHash !== monoHash,
    }, null, 2))

    if (!result.chineseOk) throw new Error('中文字形未加载')
    if (!result.pixelFamily.includes('EraPixel12')) throw new Error(`字体未应用，实际为 ${result.pixelFamily}`)
    if (pixelHash === monoHash) throw new Error('像素字体与等宽字体渲染完全相同')

    console.log('✓ 像素字体验证通过')
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((err) => {
  console.error('✗ 像素字体验证失败:', err.message)
  process.exit(1)
})
