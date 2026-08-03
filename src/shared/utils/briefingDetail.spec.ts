import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildBriefingDetailUrl, normalizeBriefingType } from './briefingDetail'

test('早点听卡片跳转到双人播报详情并保留日期和类型', () => {
  assert.equal(
    buildBriefingDetailUrl('2026-07-31', 'morning'),
    '/pages-sub-app/briefing-detail/index?date=2026-07-31&type=morning',
  )
})

test('兼容旧早点听链接的 review 参数，规范为晚报', () => {
  assert.equal(normalizeBriefingType('review'), 'evening')
  assert.equal(normalizeBriefingType('evening'), 'evening')
  assert.equal(normalizeBriefingType('morning'), 'morning')
})
