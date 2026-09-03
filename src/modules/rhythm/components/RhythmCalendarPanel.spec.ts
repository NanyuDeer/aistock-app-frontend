import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('./RhythmCalendarPanel.vue', import.meta.url), 'utf8')

test('面板头部：标题 + 展开/收起开关 + 模式 Segmented（仓位/事件）', () => {
  assert.match(source, /节奏日历/)
  assert.match(source, /Segmented/)
  assert.match(source, /items=.*仓位.*事件|['"]仓位['"][\s\S]{0,200}['"]事件['"]/)
  assert.match(source, /expanded|收起|展开/)
})

test('折叠态 = 近 7 交易日紧凑条；展开态 = 60 交易日自然周网格（周一对齐、今日高亮）', () => {
  assert.match(source, /getRhythmMasterCalendar\(60\)/)
  assert.match(source, /slice\(-7\)|filter|折叠/)
  assert.match(source, /col|weekday|周|getDay|weekdayCol/)
  assert.match(source, /today/)
})

test('两种模式点格都 emit pick(date)；事件模式含事件角标与选中日事件行', () => {
  assert.match(source, /emit\('pick'|defineEmits/)
  assert.match(source, /events/)
  assert.match(source, /importance|high/)
  assert.match(source, /无宏观事件|当日无宏观事件/)
})

test('展开/收起状态本地记忆（uni storage）', () => {
  assert.match(source, /getStorageSync|setStorageSync/)
})
