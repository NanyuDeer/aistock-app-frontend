import assert from 'node:assert/strict'
import test from 'node:test'
import { formatBandText } from './rhythmBand'

test('formatBandText 剥离「建议仓位」前缀并 trim', () => {
  assert.equal(formatBandText('建议仓位：空仓观望'), '空仓观望')
  assert.equal(formatBandText('建议仓位: 轻仓~观望'), '轻仓~观望')
  assert.equal(formatBandText('  建议仓位： 半仓~6 成  '), '半仓~6 成')
})

test('formatBandText 对旧版无前缀文案与空值安全', () => {
  assert.equal(formatBandText('轻仓~观望'), '轻仓~观望')
  assert.equal(formatBandText(''), '')
  assert.equal(formatBandText(null), '')
  assert.equal(formatBandText(undefined), '')
})
