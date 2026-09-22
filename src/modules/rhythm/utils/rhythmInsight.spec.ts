import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { toRhythmInsight, type RhythmInsightCondition } from './rhythmInsight'
import type { RhythmCard, RhythmBranch } from '@/shared/api/modules/agent'

const source = readFileSync(new URL('./rhythmInsight.ts', import.meta.url), 'utf8')

function branch(p: Partial<RhythmBranch>): RhythmBranch {
  return {
    condition: { kind: 'interval', indicator: '上证指数点位', label: '收盘站上 4050 压力位', lo: 4050, hi: null },
    conclusion: { direction: 'bullish', range: '4050-4200', validity: 5, note: '突破压力位' },
    ...p,
  } as RhythmBranch
}

test('title：非 conflict 拼接档位中文与仓位句；conflict 用背离文案', () => {
  const card = { level: 'active', position_band: { text: '建议仓位：七成~八成' }, conflict: false, branches: [] } as unknown as RhythmCard
  assert.equal(toRhythmInsight(card, 'after_close', '2026-09-02')?.title, '活跃 · 七成~八成')
  const conflict = { ...card, conflict: true, conflict_detail: '多空背离' } as unknown as RhythmCard
  assert.equal(toRhythmInsight(conflict, 'after_close', '2026-09-02')?.title, '信号背离 · 仅区间与提示')
})

test('预判 structured 同时收 interval 与 enum（事件）分支；enum 用 indicator+value，不再透传 met', () => {
  const interval = branch({})
  const eventBranch = branch({
    condition: { kind: 'enum', indicator: 'CPI 数据公布预期差', value: '超预期', label: '超预期' },
    conclusion: { direction: 'bullish', validity: 1, note: '结果待公布' },
    event_ref: { event_date: '2026-09-03', title: 'CPI 数据公布' },
    met: true,
  } as Partial<RhythmBranch> & { met?: boolean | null })
  const card = { level: 'normal', position_band: { text: '建议仓位：五成~六成' }, conflict: false, branches: [interval, eventBranch] } as unknown as RhythmCard
  const out = toRhythmInsight(card, 'morning', '2026-09-02')
  assert.equal(out?.structured?.conditions.length, 2)
  assert.equal(out?.structured?.conditions[0].condition, '收盘站上 4050 压力位')
  const ev = out?.structured?.conditions[1] as (RhythmInsightCondition & { met?: boolean | null }) | undefined
  assert.equal(ev?.condition, 'CPI 数据公布预期差超预期')
  assert.equal(ev?.direction, 'bullish')
  assert.equal(ev?.met, undefined)
})

test('括号阈值（放量（>xxx亿））→ anchor.threshold，主干保留', () => {
  const amt = branch({ condition: { kind: 'interval', indicator: '成交额', label: '放量（>120亿）', lo: 120, hi: null }, conclusion: { direction: 'bullish', range: '4050-4200', validity: 5, note: '放量突破压力位' } })
  const card = { level: 'active', position_band: { text: '建议仓位：七成~八成' }, conflict: false, branches: [amt] } as unknown as RhythmCard
  const out = toRhythmInsight(card, 'after_close', '2026-09-02')
  assert.equal(out?.structured?.conditions[0].condition, '放量')
  assert.equal(out?.structured?.conditions[0].anchor?.threshold, '>120亿')
})

test('conflict 不阻断 structured；无分支则不产 structured；card 为空返回 null', () => {
  const b = branch({})
  const c = { level: 'active', position_band: { text: 'x' }, conflict: true, branches: [b] } as unknown as RhythmCard
  assert.equal(toRhythmInsight(c, 'after_close', '2026-09-02')?.structured?.conditions.length, 1)
  const noBranches = { level: 'active', position_band: { text: 'x' }, conflict: false, branches: [] } as unknown as RhythmCard
  assert.equal(toRhythmInsight(noBranches, 'after_close', '2026-09-02')?.structured, undefined)
  assert.equal(toRhythmInsight(null, 'after_close', '2026-09-02'), null)
})

test('toCondition 透传 direction / positionAction / anchor（结构化仓位动作 + 验证锚点）', () => {
  // toCondition 应产出 { horizon, condition, scenario, direction, positionAction, anchor }
  const toCondition = source.match(/function toCondition[\s\S]*?\n\}/)?.[0] ?? ''
  assert.match(toCondition, /direction:\s*b\.conclusion\.direction/)
  assert.match(toCondition, /positionAction:\s*b\.position_action/)
  assert.match(toCondition, /anchor:\s*b\.anchor\s*\?/)
})

test('time：无 createdAt 回退 slot 标签；有 createdAt 显示 MM-DD · HH:MM（上海时区）', () => {
  const card = { level: 'normal', position_band: { text: '建议仓位：五成~六成' }, conflict: false, branches: [] } as unknown as RhythmCard
  // 兼容旧数据：无 createdAt → 旧语义（slot 标签）
  assert.equal(toRhythmInsight(card, 'midday', '2026-09-21')?.time, '09-21 · 午间')
  // createdAt 为 UTC ISO（PG timestamptz 序列化）→ 上海时区转换：04:30Z = 12:30 上海
  assert.equal(toRhythmInsight(card, 'midday', '2026-09-21', '2026-09-21T04:30:00.000Z')?.time, '09-21 · 12:30')
  // 带偏移格式
  assert.equal(toRhythmInsight(card, 'morning', '2026-09-21', '2026-09-21T01:00:00+08:00')?.time, '09-21 · 01:00')
  // 非法 createdAt → 回退旧语义
  assert.equal(toRhythmInsight(card, 'morning', '2026-09-21', 'not-a-date')?.time, '09-21 · 盘前')
})

test('toRhythmInsight 签名含 createdAt 第 4 参（B8：created_at 必须传进 mapper）', () => {
  assert.match(source, /function toRhythmInsight\(\s*card: RhythmCard \| null \| undefined,\s*slot: string,\s*targetDate: string,\s*createdAt\?: string,/)
})

test('RhythmInsightCondition 接口含 direction / positionAction / anchor 字段', () => {
  assert.match(source, /direction\?: ['"]bullish['"] \| ['"]bearish['"] \| ['"]neutral['"]/)
  assert.match(source, /positionAction\?:/)
  assert.match(source, /anchor\?:/)
})
