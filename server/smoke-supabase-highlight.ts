import assert from 'node:assert/strict'
import {
  createHighlightSetupShare,
  fetchHighlightSetupShare,
  highlightSetupPagesUrl,
  saveHighlightSetupResult,
  serverSupabaseConfig,
} from '../src/agent/supabaseHighlightSetup.ts'

const config = serverSupabaseConfig()
assert.ok(config.url.includes('supabase.co'))
assert.ok(config.anonKey.length > 40)

const markdown = `# Supabase 分享测试\n\n这是一段用于验证高亮设置分享的正文，包含关键词 Memory 与 Agent。`
const created = await createHighlightSetupShare(
  {
    projectId: 'smoke-project',
    title: 'Supabase 分享测试',
    markdown,
    config: { aspectRatio: '9:16', pageOverlay: 'pixel' },
  },
  config,
)

assert.ok(created.shareId)
assert.equal(
  created.url,
  `https://bibidu.github.io/era/?highlightSetup=1&shareId=${created.shareId}`,
)
assert.equal(highlightSetupPagesUrl(created.shareId), created.url)

const loaded = await fetchHighlightSetupShare(created.shareId, config)
assert.equal(loaded.markdown, markdown)
assert.equal(loaded.title, 'Supabase 分享测试')
assert.equal((loaded.config as { aspectRatio?: string }).aspectRatio, '9:16')

const ranges = [
  {
    style: 'circle' as const,
    blockId: 'demo::0::title',
    start: 0,
    end: 4,
    color: '#FACC15',
    text: 'Supa',
  },
]
const clipboard = `ERA_HIGHLIGHT_SETUP_V1\n\`\`\`json\n${JSON.stringify({ type: 'era_highlight_setup', version: 1, projectId: 'smoke-project', ranges }, null, 2)}\n\`\`\``
const saved = await saveHighlightSetupResult(
  created.shareId,
  { resultRanges: ranges, resultClipboard: clipboard },
  config,
)
assert.ok(Array.isArray(saved.result_ranges))
assert.equal((saved.result_ranges as unknown[]).length, 1)
assert.ok(String(saved.result_clipboard).includes('ERA_HIGHLIGHT_SETUP_V1'))

console.log('supabase highlight setup ok', created.shareId)
