import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const pageSource = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

test('降级且无不确定性时显示无法验证及降级原因', () => {
  assert.match(
    pageSource,
    /<text v-else-if="msg\.trace\.degraded" class="uncertainty-item">\s*无法验证：\{\{ msg\.trace\.degraded_reason \|\| '降级原因未提供' \}\}\s*<\/text>/,
  )
  assert.match(
    pageSource,
    /<text v-else class="evidence-value">无已知未解决问题<\/text>/,
  )
})

test('证据溯源始终保留数据截至、来源和降级状态', () => {
  assert.match(pageSource, /\{\{ msg\.trace\.as_of \|\| '截至时间未验证' \}\}/)
  assert.match(pageSource, /v-if="msg\.trace\.sources\.length > 0"/)
  assert.match(pageSource, /\{\{ msg\.trace\.degraded \? \(msg\.trace\.degraded_reason \|\| '数据降级'\) : '未降级' \}\}/)
})

test('证据溯源展示工件 ID、来源 source_id 与 kind', () => {
  assert.match(pageSource, /\{\{ msg\.trace\.artifact_id \|\| '未提供' \}\}/)
  assert.match(pageSource, /\{\{ sourceKindLabel\(src\.kind\) \}\}/)
  assert.match(pageSource, /\{\{ src\.source_id \}\}/)
})
