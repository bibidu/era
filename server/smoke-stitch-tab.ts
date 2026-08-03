import assert from 'node:assert/strict'
import { readAppTabFromSearch } from '../src/app/tabRouting.ts'

assert.equal(readAppTabFromSearch('?tab=stitch'), 'stitch')
assert.equal(readAppTabFromSearch('?tab=STITCH'), 'stitch')
assert.equal(readAppTabFromSearch('?tab=data'), 'data')
assert.equal(readAppTabFromSearch(''), 'data')

console.log('stitch tab smoke ok')
