import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatShanghaiDateTime } from './datetime'

test('formatShanghaiDateTime 固定以 UTC+8 显示 UTC 时间戳', () => {
  assert.equal(
    formatShanghaiDateTime('2026-07-31T19:25:07.173Z'),
    '2026-08-01 03:25',
  )
})
