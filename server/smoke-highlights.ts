import assert from 'node:assert/strict'
import { applyHighlightRanges, emptyHighlightMaps } from '../src/agent/highlightRanges.ts'

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

console.log('highlightRanges ok')
