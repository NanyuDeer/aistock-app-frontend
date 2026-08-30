import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('./RhythmCard.vue', import.meta.url), 'utf8')

test('节奏状态卡渲染契约：免责横幅/区间倾向/温度曲线/分支/空态区分', () => {
  assert.match(source, /不构成任何投资建议/)
  assert.match(source, /position_band/)
  assert.match(source, /temperature_series/)
  assert.match(source, /rc-temp-bar/)
  assert.match(source, /data_missing/)
  assert.match(source, /event_source_missing/)
  assert.match(source, /branches/)
  assert.match(source, /rc-slot|slotLabel/)
})

test('I1（验收 3）：event_high_hint 渲染（after_close 基准卡与增量分支同源字段，空串不渲染）', () => {
  assert.match(source, /event_high_hint/)
  assert.match(source, /v-if="card\.event_high_hint"/)
  assert.match(source, /rc-hint/)
})

test('G15：事件分支公布前（enum + range 为空）只展示 note，不展示 direction 标签', () => {
  assert.match(source, /branchConclusionText/)
  assert.match(source, /condition\.kind === 'enum' && !b\.conclusion\.range/)
  assert.match(source, /b\.conclusion\.note \|\| '结果待公布'/)
  // 模板不再内联 direction 前缀（旧版为 {{ directionLabel(...) }}：{{ ... }}），改由 branchConclusionText 控制
  assert.doesNotMatch(source, /\{\{ directionLabel\(b\.conclusion\.direction\) \}\}/)
})

test('情绪周期行在 phase 缺失时也渲染：phaseLabel 兜底"数据缺失（沿用前值）"可达（无外层 v-if 死分支）', () => {
  assert.doesNotMatch(source, /class="rc-phase" v-if="card\.phase"/)
  assert.match(source, /情绪周期：\{\{ phaseLabel \}\}/)
  assert.match(source, /数据缺失（沿用前值）/)
})
