import assert from 'node:assert/strict'
import {
  applyHighlightRanges,
  emptyHighlightMaps,
  highlightMapsToRanges,
  parseHighlightMapKey,
  remapHighlightRanges,
} from '../src/agent/highlightRanges.ts'
import {
  buildHighlightSetupPayload,
  parseHighlightSetup,
  serializeHighlightSetup,
  toApplyHighlightRanges,
} from '../src/agent/highlightClipboard.ts'

const maps = emptyHighlightMaps()
const { maps: next, applied, errors } = applyHighlightRanges(maps, [
  {
    style: 'brush',
    blockId: 'b1::0::paragraph',
    start: 0,
    end: 3,
    color: '#FACC15',
  },
])

assert.equal(applied, 3)
assert.equal(errors.length, 0)
assert.equal(next.brushHighlightColors['b1::0::paragraph:0'], '#FACC15')
assert.equal(next.brushHighlightColors['b1::0::paragraph:2'], '#FACC15')
assert.equal(next.brushHighlightColors['b1::0::paragraph:3'], undefined)

const bad = applyHighlightRanges(maps, [
  { style: 'underline', blockId: '', start: 0, end: 1, color: '#fff' },
  { style: 'underline', blockId: 'x', start: 5, end: 2, color: '#fff' },
])
assert.equal(bad.applied, 0)
assert.equal(bad.errors.length, 2)

const parsedKey = parseHighlightMapKey('uuid::0::title:12')
assert.deepEqual(parsedKey, { blockId: 'uuid::0::title', index: 12 })

const merged = applyHighlightRanges(
  emptyHighlightMaps(),
  [
    { style: 'circle', blockId: 't::0::title', start: 0, end: 2, color: '#EF4444' },
    { style: 'circle', blockId: 't::0::title', start: 2, end: 4, color: '#EF4444' },
    { style: 'brush', blockId: 'p::0::paragraph', start: 1, end: 3, color: '#FACC15' },
  ],
  { replace: true },
)
const ranges = highlightMapsToRanges(merged.maps, {
  't::0::title': '关键词汇',
  'p::0::paragraph': 'abcdefgh',
})
assert.equal(ranges.length, 2)
assert.deepEqual(ranges[0], {
  style: 'brush',
  blockId: 'p::0::paragraph',
  start: 1,
  end: 3,
  color: '#FACC15',
  text: 'bc',
})
assert.deepEqual(ranges[1], {
  style: 'circle',
  blockId: 't::0::title',
  start: 0,
  end: 4,
  color: '#EF4444',
  text: '关键词汇',
})

const replaced = applyHighlightRanges(
  merged.maps,
  [{ style: 'underline', blockId: 'p::0::paragraph', start: 0, end: 1, color: '#525252' }],
  { replace: true },
)
assert.equal(Object.keys(replaced.maps.circleHighlightColors).length, 0)
assert.equal(replaced.maps.underlineHighlightColors['p::0::paragraph:0'], '#525252')

const payload = buildHighlightSetupPayload('proj-1', ranges)
const serialized = serializeHighlightSetup(payload)
assert.ok(serialized.includes('ERA_HIGHLIGHT_SETUP_V1'))
const roundtrip = parseHighlightSetup(serialized)
assert.ok(roundtrip)
assert.equal(roundtrip?.projectId, 'proj-1')
assert.equal(roundtrip?.ranges.length, 2)
assert.deepEqual(toApplyHighlightRanges(roundtrip!.ranges)[1], {
  style: 'circle',
  blockId: 't::0::title',
  start: 0,
  end: 4,
  color: '#EF4444',
})

const remapped = remapHighlightRanges(
  [
    {
      style: 'brush',
      blockId: 'old-block::0::paragraph',
      start: 9,
      end: 27,
      color: '#22C55E',
      text: 'hugohe3/ppt-master',
    },
  ],
  {
    'new-block::0::paragraph':
      '本文介绍的仓库为 hugohe3/ppt-master（作者 Hugo He / 仓库名 ppt-master）。',
  },
)
assert.equal(remapped.remapped, 1)
assert.equal(remapped.errors.length, 0)
assert.equal(remapped.ranges[0]?.blockId, 'new-block::0::paragraph')
assert.equal(remapped.ranges[0]?.start, 9)

console.log('highlightRanges ok')
