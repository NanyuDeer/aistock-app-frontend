import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

test('Brief 详情使用上海默认日期和共享纯日历加减', () => {
  assert.match(source, /import \{ addCalendarDays, shanghaiDateString \} from '@\/shared\/utils\/tradingTime'/)
  assert.match(source, /currentDate\.value = addCalendarDays\(currentDate\.value, delta\)/)
  assert.match(source, /opts\.date \|\| shanghaiDateString\(\)/)
})
