import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const pageSource = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

test('证据溯源使用 MarketTraceEvidence 组件渲染', () => {
  // 验证组件已导入
  assert.match(pageSource, /import MarketTraceEvidence from/)
  // 验证模板中使用组件并传递 trace prop
  assert.match(pageSource, /<MarketTraceEvidence[^>]*:trace="msg\.trace"/)
})

test('证据溯源内联代码已移除（逻辑由组件接管）', () => {
  // 确保不再有内联的 evidence-area class
  assert.doesNotMatch(pageSource, /class="evidence-area"/)
  // 确保不再有内联的 confidenceLabel / sourceKindLabel 函数
  assert.doesNotMatch(pageSource, /function confidenceLabel/)
  assert.doesNotMatch(pageSource, /function sourceKindLabel/)
})
