import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import { formatShanghaiDateTime, shanghaiDateKeyDaysAgo } from './datetime'

const realNow = Date.now
afterEach(() => {
  // 恢复真实时钟，避免影响其它用例
  ;(Date as unknown as { now: () => number }).now = realNow
})

/** 固定当前时刻（绝对 UTC 时间戳），用于隔离 helper 依赖的运行环境时区/当日漂移 */
function withNow(isoNow: string, fn: () => void) {
  const ts = Date.parse(isoNow)
  if (Number.isNaN(ts)) throw new Error(`bad isoNow ${isoNow}`)
  ;(Date as unknown as { now: () => number }).now = () => ts
  try {
    fn()
  } finally {
    ;(Date as unknown as { now: () => number }).now = realNow
  }
}

test('formatShanghaiDateTime 固定以 UTC+8 显示 UTC 时间戳', () => {
  assert.equal(
    formatShanghaiDateTime('2026-07-31T19:25:07.173Z'),
    '2026-08-01 03:25',
  )
})

test('shanghaiDateKeyDaysAgo(0)：取"当前时刻的上海日期"', () => {
  // 上海 2026-01-05 00:00 = UTC 2026-01-04T16:00:00Z（固定绝对时刻，断言不受本机时区影响）
  withNow('2026-01-04T16:00:00.000Z', () => {
    assert.equal(shanghaiDateKeyDaysAgo(0), '2026-01-05')
  })
  // 上海 2026-01-05 23:59 仍属同一上海日（跨 UTC 午夜但未跨上海日）
  withNow('2026-01-05T15:59:00.000Z', () => {
    assert.equal(shanghaiDateKeyDaysAgo(0), '2026-01-05')
  })
  // UTC 2026-01-05T16:00:00Z = 上海 2026-01-06 00:00，已进入新的一天
  withNow('2026-01-05T16:00:00.000Z', () => {
    assert.equal(shanghaiDateKeyDaysAgo(0), '2026-01-06')
  })
})

test('shanghaiDateKeyDaysAgo(13)：最近 14 个自然日下界 = 上海今天-13（跨年）', () => {
  withNow('2026-01-04T16:00:00.000Z', () => {
    // 上海 2026-01-05 - 13 天 → 2025-12-23（跨到前一年 12 月）
    assert.equal(shanghaiDateKeyDaysAgo(13), '2025-12-23')
  })
})

test('shanghaiDateKeyDaysAgo：月末跨 2 月（非闰年 28 天）', () => {
  // 上海 2026-03-01 = UTC 2026-02-28T16:00:00Z；days=1 跨到 2 月末
  withNow('2026-02-28T16:00:00.000Z', () => {
    assert.equal(shanghaiDateKeyDaysAgo(0), '2026-03-01')
    assert.equal(shanghaiDateKeyDaysAgo(1), '2026-02-28')
    assert.equal(shanghaiDateKeyDaysAgo(13), '2026-02-16')
  })
})
