import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const version = process.env.GITHUB_SHA || process.env.BUILD_VERSION || 'dev'
const builtAt = new Date().toISOString()
const distDir = join(process.cwd(), 'dist')
const indexPath = join(distDir, 'index.html')

writeFileSync(
  join(distDir, 'version.json'),
  `${JSON.stringify({ version, builtAt }, null, 2)}\n`,
)

let html = readFileSync(indexPath, 'utf8')
const injection = [
  `<meta name="era-build" content="${version}" />`,
  `<script>window.__ERA_BUILD__="${version}"</script>`,
].join('\n    ')

if (!html.includes('name="era-build"')) {
  html = html.replace('</head>', `    ${injection}\n  </head>`)
}

writeFileSync(indexPath, html)

console.log(`Injected build version ${version} into dist/`)
