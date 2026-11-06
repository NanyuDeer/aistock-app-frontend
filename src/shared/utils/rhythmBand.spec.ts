import assert from 'node:assert/strict'
import test from 'node:test'
import { formatBandText } from './rhythmBand'

test('formatBandText 剥离「建议仓位」前缀并 trim', () => {
  assert.equal(formatBandText('建议仓位：空仓观望'), '空仓观望')
  assert.equal(formatBandText('建议仓位: 轻仓~观望'), '轻仓~观望')
  assert.equal(formatBandText('  建议仓位： 半仓~6 成  '), '半仓~6 成')
  // 2026-11 阶梯文案重定后前缀未变，正则仍可用（无需改 rhythmBand.ts）
  assert.equal(formatBandText('建议仓位：满仓（九成以上）'), '满仓（九成以上）')
})

test('formatBandText 对旧版无前缀文案与空值安全', () => {
  assert.equal(formatBandText('轻仓~观望'), '轻仓~观望')
  assert.equal(formatBandText(''), '')
  assert.equal(formatBandText(null), '')
  assert.equal(formatBandText(undefined), '')
})
