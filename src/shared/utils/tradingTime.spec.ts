import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  addCalendarDays,
  isTradingTime,
  shanghaiDateString,
  shanghaiDateTimeParts,
} from './tradingTime'

test('shanghaiDateString 在上海凌晨返回上海自然日，而非 UTC 前一天', () => {
  // 2026-07-25 01:00 上海时间 = 2026-07-24 17:00 UTC
  // toISOString 会返回 '2026-07-24'，但上海交易日已是 07-25。
  const shanghaiEarlyMorning = new Date('2026-07-24T17:00:00Z')
  assert.equal(shanghaiDateString(shanghaiEarlyMorning), '2026-07-25')
})

test('shanghaiDateString 在上海白天返回当天', () => {
  // 2026-07-24 18:00 上海时间 = 2026-07-24 10:00 UTC
  const shanghaiDaytime = new Date('2026-07-24T10:00:00Z')
  assert.equal(shanghaiDateString(shanghaiDaytime), '2026-07-24')
})

test('shanghaiDateString 始终返回带零填充的 YYYY-MM-DD', () => {
  // 2026-01-01 05:00 上海时间 = 2025-12-31 21:00 UTC
  const newYearMorning = new Date('2025-12-31T21:00:00Z')
  assert.equal(shanghaiDateString(newYearMorning), '2026-01-01')
})

test('shanghaiDateString 不依赖设备本地时区（用 UTC 输入验证）', () => {
  // 用一个明确的 UTC 时刻，无论测试机时区如何都应返回同一上海日期
  const fixed = new Date('2026-03-14T16:30:00Z') // 上海 2026-03-15 00:30
  assert.equal(shanghaiDateString(fixed), '2026-03-15')
})

test('上海时间在 15:29 仍为晨报时段，15:30 切换为晚报时段', () => {
  const beforeClose = shanghaiDateTimeParts(new Date('2026-07-24T07:29:00Z'))
  const afterClose = shanghaiDateTimeParts(new Date('2026-07-24T07:30:00Z'))

  assert.deepEqual(beforeClose, { year: 2026, month: 7, day: 24, weekday: 5, hour: 15, minute: 29 })
  assert.deepEqual(afterClose, { year: 2026, month: 7, day: 24, weekday: 5, hour: 15, minute: 30 })
  assert.equal(isTradingTime(new Date('2026-07-24T07:29:00Z')), false)
  assert.equal(isTradingTime(new Date('2026-07-24T01:30:00Z')), true)
})

test('纯日历日期加减不受设备时区影响且正确跨年', () => {
  assert.equal(addCalendarDays('2025-12-31', 1), '2026-01-01')
  assert.equal(addCalendarDays('2026-01-01', -1), '2025-12-31')
})
