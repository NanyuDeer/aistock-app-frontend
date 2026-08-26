import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildBriefingUrl } from './briefingNavigation'

test('播报入口保留当前 Brief 类型和日期', () => {
  assert.equal(
    buildBriefingUrl('evening', '2026-07-24'),
    '/pages-sub-app/briefing/index?type=evening&date=2026-07-24',
  )
})

test('午间报入口带 midday 类型', () => {
  assert.equal(
    buildBriefingUrl('midday', '2026-07-24'),
    '/pages-sub-app/briefing/index?type=midday&date=2026-07-24',
  )
})
