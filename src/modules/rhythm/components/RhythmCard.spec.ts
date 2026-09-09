import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('./RhythmCard.vue', import.meta.url), 'utf8')

test('节奏状态卡渲染契约：免责横幅/区间倾向/温度曲线/空态区分', () => {
  assert.match(source, /不构成任何投资建议/)
  assert.match(source, /position_band/)
  assert.match(source, /temperature_series/)
  assert.match(source, /rc-temp-bar/)
  assert.match(source, /data_missing/)
  assert.match(source, /event_source_missing/)
  assert.match(source, /rc-slot|slotLabel/)
})

test('设计稿：主档位卡含五档色带刻度 + target/basis/refresh 元信息', () => {
  assert.match(source, /rc-scale/)
  assert.match(source, /rc-lab/)
  assert.match(source, /冰点.*低迷.*常温.*活跃.*亢奋/)
  assert.match(source, /rc-meta/)
  assert.match(source, /targetDate/)
  assert.match(source, /basisDate/)
  assert.match(source, /refreshSlot/)
})

test('设计稿：分区卡（情绪周期/事件日历）+ 阶段 chip + 实验性判定', () => {
  assert.match(source, /rc-sec-title/)
  assert.match(source, /情绪周期/)
  assert.match(source, /rc-chip/)
  assert.match(source, /实验性判定/)
  assert.match(source, /未来 5 交易日事件日历/)
  assert.match(source, /rc-evtag/)
})

test('I1（验收 3）：event_high_hint 渲染（after_close 基准卡与增量分支同源字段，空串不渲染）', () => {
  assert.match(source, /event_high_hint/)
  assert.match(source, /v-if="card\.event_high_hint"/)
  assert.match(source, /rc-hint/)
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

test('去重瘦身：rc-pos 长句 / rc-branch 区块 / rc-phase-ev 证据行已移除（摘要上移洞见卡）', () => {
  assert.doesNotMatch(source, /rc-pos/)
  assert.doesNotMatch(source, /rc-branch/)
  assert.doesNotMatch(source, /rc-phase-ev/)
})
