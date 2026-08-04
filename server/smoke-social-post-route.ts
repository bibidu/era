/**
 * 社媒帖子详情二级路由 smoke：?tab=data&post=<id>
 */
import assert from 'node:assert/strict'
import { readAppTabFromSearch, readSocialPostIdFromSearch } from '../src/app/tabRouting.ts'

assert.equal(readSocialPostIdFromSearch('?tab=data&post=abc-123'), 'abc-123')
assert.equal(readSocialPostIdFromSearch('?tab=data'), null)
assert.equal(readSocialPostIdFromSearch(''), null)
assert.equal(readAppTabFromSearch('?tab=data&post=abc-123'), 'data')

const mangled = '?tab%3Ddata%26post%3Dabc-123'
assert.equal(readAppTabFromSearch(mangled), 'data')
assert.equal(readSocialPostIdFromSearch(mangled), 'abc-123')

console.log('social post route ok')
