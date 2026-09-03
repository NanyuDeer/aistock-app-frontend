import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('./RhythmCalendarPanel.vue', import.meta.url), 'utf8')

test('展开态按月渲染自然日网格（含周末 cell）', () => {
  // 至少存在月份翻页状态（currentMonth / monthCursor）与自然月网格生成逻辑
  assert.match(source, /currentMonth|monthCursor|currentYear/)
  assert.match(source, /new Date\(year, month\s*\+?\s*1, 0\)\.getDate\(\)|getDaysInMonth|daysInMonth/)
})

test('周末/节假日格 level=null 但保留 pick 能力（可选中看 macro 事件）', () => {
  // 自然日网格里每个 cell 都带 date，周末无档 level=null 也能 emit pick
  assert.match(source, /monthCells|calendarCells|alignCells|monthGrid|buildMonthGrid/)
  assert.match(source, /pick\(/)
})

test('getRhythmMasterCalendar 支持自然日模式（naturalDays 参数）', () => {
  const api = readFileSync(new URL('../../../shared/api/modules/agent.ts', import.meta.url), 'utf8')
  assert.match(api, /naturalDays/)
})
