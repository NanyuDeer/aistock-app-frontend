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

test('折叠近 7 交易日紧凑条走交易日数据源（dayList），展开网格走自然日数据源（dayListRaw）', () => {
  // dayList = 交易日数据源（getRhythmMasterCalendar(60) 单参数 days=60，不含周末）
  assert.match(source, /getRhythmMasterCalendar\(60\)\.then/)
  // dayListRaw = 自然日数据源（getRhythmMasterCalendar(60, 60) naturalDays=60，含周末）
  assert.match(source, /getRhythmMasterCalendar\(60, 60\)\.then/)
  // 两条数据源各自独立持久化（dayList 不再复用 dayListRaw，否则周末会混入折叠紧凑条）
  assert.match(source, /const dayList = ref<RhythmCalendarDay\[\]>\(\[\]\)/)
  assert.match(source, /const dayListRaw = ref<RhythmCalendarDay\[\]>\(\[\]\)/)
})

test('selectedEvents 在交易日数据源未命中时回退自然日数据源（周末/节假日 cell 仍可看当日 macro 事件）', () => {
  // 事件面板查找需同时覆盖交易日（dayList/ascending）与自然日（dayListRaw）两条来源，
  // 保证展开网格周末/节假日格显示的事件角标在选中后仍能在事件面板列出，而非"当日无宏观事件"。
  assert.match(source, /ascending\.value\.find\(\(d\) => d\.date === props\.targetDate\)/)
  assert.match(source, /dayListRaw\.value\.find\(\(d\) => d\.date === props\.targetDate\)/)
})
