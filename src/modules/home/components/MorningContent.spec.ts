import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const componentSource = readFileSync(new URL('./MorningContent.vue', import.meta.url), 'utf8')

test('首页对降级 Brief 显示明确的证据不完整标识', () => {
  assert.match(componentSource, /v-if="report\?\.degraded" class="briefing-degraded"/)
  assert.match(componentSource, /证据不完整/)
})

test('首页展示真实缺失来源，且零条 Brief 不显示为关键线索', () => {
  assert.match(componentSource, /report\?\.missing_sources\.join\('、'\)/)
  assert.match(componentSource, /v-if="briefingClueCount > 0"/)
})
