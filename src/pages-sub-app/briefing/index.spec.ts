import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

test('播报页只消费通过严格 parser 的 dialogue 与音频路径', () => {
  assert.match(source, /parseBroadcastReport\(data, broadcastType\.value, currentDate\.value\)/)
  assert.doesNotMatch(source, /reportText/)
  assert.doesNotMatch(source, /text\.split\('\\n'\)/)
  assert.doesNotMatch(source, /JSON\.parse\(text\)/)
})

test('播报页通过共享纯日历工具切换日期', () => {
  assert.match(source, /import \{ addCalendarDays, shanghaiDateString \} from '@\/shared\/utils\/tradingTime'/)
  assert.match(source, /currentDate\.value = addCalendarDays\(currentDate\.value, delta\)/)
})
