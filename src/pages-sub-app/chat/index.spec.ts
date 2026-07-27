import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const pageSource = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

test('market_review 模式且消息存在 trace 时挂载证据组件', () => {
  assert.match(
    pageSource,
    /<MarketTraceEvidence\s+v-if="chatMode === 'market_review' && msg\.trace"\s+:trace="msg\.trace"\s*\/>/,
  )
})

test('页面将 date 查询参数交给市场复盘问答', () => {
  assert.match(pageSource, /marketQa\.setReportDate\(options\?\.date\)/)
})
