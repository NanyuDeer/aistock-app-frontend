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

test('设计稿：主档位卡含五档色带刻度 + 档位 chip + target/basis/refresh 元信息', () => {
  assert.match(source, /rc-scale/)
  assert.match(source, /rc-lab/)
  assert.match(source, /冰点.*低迷.*常温.*活跃.*亢奋/)
  assert.match(source, /rc-level/)
  assert.match(source, /rc-meta/)
  assert.match(source, /targetDate/)
  assert.match(source, /basisDate/)
  assert.match(source, /refreshSlot/)
})

test('设计稿：分区卡（情绪周期/事件日历/关键节点分支）+ 阶段 chip + 实验性判定', () => {
  assert.match(source, /rc-sec-title/)
  assert.match(source, /情绪周期/)
  assert.match(source, /rc-chip/)
  assert.match(source, /实验性判定/)
  assert.match(source, /未来 5 交易日事件日历/)
  assert.match(source, /rc-evtag/)
  assert.match(source, /关键节点分支/)
})

test('设计稿：分支结论行含方向 chip（rc-dir）+ 区间点位（rc-range）+ note', () => {
  assert.match(source, /rc-dir/)
  assert.match(source, /rc-range/)
  assert.match(source, /rc-note/)
  assert.match(source, /dir-up/)
  assert.match(source, /dir-down/)
  assert.match(source, /dir-neutral/)
})

test('I1（验收 3）：event_high_hint 渲染（after_close 基准卡与增量分支同源字段，空串不渲染）', () => {
  assert.match(source, /event_high_hint/)
  assert.match(source, /v-if="card\.event_high_hint"/)
  assert.match(source, /rc-hint/)
})

test('G15：事件分支公布前（enum + range 为空）只展示待公布，不展示 direction 标签', () => {
  assert.match(source, /directionMeta/)
  assert.match(source, /condition\.kind === 'enum' && !b\.conclusion\.range/)
  assert.match(source, /b\.conclusion\.note \|\| '结果待公布'/)
  assert.match(source, /待公布/)
})

test('情绪周期在 phase 缺失时兜底"数据缺失（沿用前值）"可达（无外层 v-if 死分支）', () => {
  assert.doesNotMatch(source, /class="rc-phase" v-if="card\.phase"/)
  assert.match(source, /rc-chip/)
  assert.match(source, /数据缺失（沿用前值）/)
  assert.match(source, /phaseMeta\.value\.label \|\| props\.card\.phase \|\| '数据缺失（沿用前值）'/)
})

test('P1：next_event_anchor 锚点条渲染（无锚点整块不渲染）', () => {
  assert.match(source, /next_event_anchor/)
  assert.match(source, /v-if="card\.next_event_anchor"/)
  assert.match(source, /下一重大事件/)
  assert.match(source, /rc-anchor/)
})
