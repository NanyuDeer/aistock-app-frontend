import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

test('播报页只消费通过严格 parser 的 dialogue 与音频路径', () => {
  assert.match(source, /parseBroadcastReport\(broadcastRes\.value(?: as BroadcastV1)?, broadcastType\.value, date\)/)
  assert.match(source, /agentApi\.getBrief\(broadcastType\.value, date\)/)
  assert.doesNotMatch(source, /agentApi\.getReport\(reportType, currentDate\.value\)/)
  assert.doesNotMatch(source, /reportText/)
  assert.doesNotMatch(source, /text\.split\('\\n'\)/)
  assert.doesNotMatch(source, /JSON\.parse\(text\)/)
})

test('播报页通过共享纯日历工具切换日期', () => {
  assert.match(source, /from '@\/shared\/utils\/tradingTime'/)
  assert.match(source, /addCalendarDays/)
  assert.match(source, /shanghaiDateString/)
  assert.match(source, /currentDate\.value = addCalendarDays\(currentDate\.value, delta\)/)
})

test('非交易日无当日报告时自动回退最近可用报告并标注日期', () => {
  assert.match(source, /MAX_FALLBACK_DAYS/)
  assert.match(source, /addCalendarDays\(requested, -offset\)/)
  assert.match(source, /当前显示最近可用报告/)
  assert.match(source, /isFallback\.value = true/)
})

test('午间报 Tab 独立分支：走 getReport(midday) + 严格解析器渲染 display_report', () => {
  assert.match(source, /switchType\('midday'\)/)
  assert.match(source, /agentApi\.getReport\('midday', date\)/)
  assert.match(source, /parseMiddayReport\(/)
  assert.match(source, /content\.display_report/)
  assert.match(source, /午间报/)
})

test('午间报不消费广播型字段：无 broadcast_midday、音频仅经 content.audio_path', () => {
  assert.doesNotMatch(source, /broadcast_midday/)
  assert.doesNotMatch(source, /getBroadcast\('midday'/)
  assert.match(source, /content\.audio_path/)
})

test('午间报无音频时隐藏音频条只展示文字（空态用 hasAnyContent 守卫）', () => {
  assert.match(source, /hasAnyContent/)
  assert.match(source, /empty-state/)
})
