/**
 * 临时数据治理：类型枚举与 stitch CLI 可加载性
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {
  DEFAULT_SOCIAL_VIDEO_TEMP_GOVERN_STATUS,
  SOCIAL_VIDEO_TEMP_GOVERN_STATUSES,
} from '../src/agent/supabaseSocialVideoAnalysis'

assert.deepEqual(SOCIAL_VIDEO_TEMP_GOVERN_STATUSES, [
  '未治理',
  '正在治理',
  '治理成功',
  '治理失败',
])
assert.equal(DEFAULT_SOCIAL_VIDEO_TEMP_GOVERN_STATUS, '未治理')

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'era-govern-stitch-'))
const a = path.join(tmp, 'a.png')
const b = path.join(tmp, 'b.png')
const out = path.join(tmp, 'out.jpg')

await sharp({
  create: { width: 40, height: 20, channels: 3, background: '#ff0000' },
})
  .png()
  .toFile(a)
await sharp({
  create: { width: 40, height: 30, channels: 3, background: '#00ff00' },
})
  .png()
  .toFile(b)

const result = spawnSync(
  process.execPath,
  ['scripts/stitch-images-vertical.mjs', '--out', out, a, b],
  { encoding: 'utf8' },
)
assert.equal(result.status, 0, result.stderr || result.stdout)
assert.ok(fs.existsSync(out), 'stitched output missing')
const meta = await sharp(out).metadata()
assert.equal(meta.width, 40)
assert.equal(meta.height, 50)

console.log('temp govern smoke ok')
