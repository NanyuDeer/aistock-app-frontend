import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { toRhythmInsight, composeRhythmTitle, RHYTHM_DELTA_UI, type RhythmInsightCondition } from './rhythmInsight'
import type { RhythmCard, RhythmBranch } from '@/shared/api/modules/agent'

const source = readFileSync(new URL('./rhythmInsight.ts', import.meta.url), 'utf8')

function makeCard(p: Record<string, unknown>): RhythmCard {
  return {
    position_index: 0,
    position_band: { text: '建议仓位：空仓观望' },
    conflict: false,
    branches: [],
    ...p,
  } as unknown as RhythmCard
}

function branch(p: Partial<RhythmBranch>): RhythmBranch {
  return {
    condition: { kind: 'interval', indicator: '上证指数点位', label: '收盘站上 4050 压力位', lo: 4050, hi: null },
    conclusion: { direction: 'bullish', range: '4050-4200', validity: 5, note: '突破压力位' },
    ...p,
  } as RhythmBranch
}

test('title：非 conflict 恒取仓位文案；conflict 用背离文案', () => {
  const card = { position_index: 3, position_band: { text: '建议仓位：重仓（七~八成）' }, conflict: false, branches: [] } as unknown as RhythmCard
  assert.equal(toRhythmInsight(card, 'after_close', '2026-09-02')?.title, '重仓（七~八成）')
  const conflict = { ...card, conflict: true, conflict_detail: '多空背离' } as unknown as RhythmCard
  assert.equal(toRhythmInsight(conflict, 'after_close', '2026-09-02')?.title, '信号背离 · 仅区间与提示')
})

test('title 两段式：有压制原因拼 `{仓位} · {压制原因}`；缺失时退化为纯仓位（不补分隔符）', () => {
  assert.equal(composeRhythmTitle('空仓观望', '关键条件卡着'), '空仓观望 · 关键条件卡着')
  assert.equal(composeRhythmTitle('空仓观望'), '空仓观望')
  assert.equal(composeRhythmTitle('空仓观望', ''), '空仓观望')
  assert.equal(composeRhythmTitle('', '关键条件卡着'), '关键条件卡着')
})

test('title 仓位缺失回退 position_index 短码（不再退回 level 档位词）', () => {
  const byIndex = { position_index: 0, conflict: false, branches: [] } as unknown as RhythmCard
  assert.equal(toRhythmInsight(byIndex, 'after_close', '2026-09-02')?.title, '空')
  // 旧报告：无 position_band 也无 position_index → 不臆造标题（整卡不渲染）
  const empty = { conflict: false, branches: [] } as unknown as RhythmCard
  assert.equal(toRhythmInsight(empty, 'after_close', '2026-09-02'), null)
})

test('T3：删除 LEVEL_LABEL，源码不再出现档位词表与 level 消费', () => {
  assert.doesNotMatch(source, /LEVEL_LABEL/)
  assert.doesNotMatch(source, /card\.level/)
  assert.match(source, /positionShort\(card\.position_index\)/)
})

test('预判 structured 同时收 interval 与 enum（事件）分支；enum 用 indicator+value，不再透传 met', () => {
  const interval = branch({})
  const eventBranch = branch({
    condition: { kind: 'enum', indicator: 'CPI 数据公布预期差', value: '超预期', label: '超预期' },
    conclusion: { direction: 'bullish', validity: 1, note: '结果待公布' },
    event_ref: { event_date: '2026-09-03', title: 'CPI 数据公布' },
    met: true,
  } as Partial<RhythmBranch> & { met?: boolean | null })
  const card = { position_index: 2, position_band: { text: '建议仓位：半仓（四~六成）' }, conflict: false, branches: [interval, eventBranch] } as unknown as RhythmCard
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
  const card = { position_index: 3, position_band: { text: '建议仓位：重仓（七~八成）' }, conflict: false, branches: [amt] } as unknown as RhythmCard
  const out = toRhythmInsight(card, 'after_close', '2026-09-02')
  assert.equal(out?.structured?.conditions[0].condition, '放量')
  assert.equal(out?.structured?.conditions[0].anchor?.threshold, '>120亿')
})

test('conflict 不阻断 structured；无分支则不产 structured；card 为空返回 null', () => {
  const b = branch({})
  const c = { position_index: 3, position_band: { text: 'x' }, conflict: true, branches: [b] } as unknown as RhythmCard
  assert.equal(toRhythmInsight(c, 'after_close', '2026-09-02')?.structured?.conditions.length, 1)
  const noBranches = { position_index: 3, position_band: { text: 'x' }, conflict: false, branches: [] } as unknown as RhythmCard
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

test('time：主行 slot 标签（版本标注）+ timeNote 生成时刻灰字（上海时区恒真展示，v3 R-H）', () => {
  const card = { position_index: 2, position_band: { text: '建议仓位：半仓（四~六成）' }, conflict: false, branches: [] } as unknown as RhythmCard
  // 无 createdAt → 只有主行 slot 标签，无 timeNote
  const noCreated = toRhythmInsight(card, 'midday', '2026-09-21')
  assert.equal(noCreated?.time, '09-21 · 午间')
  assert.equal(noCreated?.timeNote, undefined)
  // createdAt 为 UTC ISO（PG timestamptz 序列化）→ 上海时区转换：04:30Z = 12:30 上海（生产漂移值恒真展示）
  const withCreated = toRhythmInsight(card, 'midday', '2026-09-21', '2026-09-21T04:30:00.000Z')
  assert.equal(withCreated?.time, '09-21 · 午间')
  assert.equal(withCreated?.timeNote, '12:30 生成')
  // 带偏移格式
  assert.equal(toRhythmInsight(card, 'morning', '2026-09-21', '2026-09-21T01:00:00+08:00')?.timeNote, '01:00 生成')
  // 非法 createdAt → 回退（无 timeNote）
  assert.equal(toRhythmInsight(card, 'morning', '2026-09-21', 'not-a-date')?.timeNote, undefined)
})

test('RhythmInsightCard 接口含 timeNote 可选字段（无 pill 后的版本标注次行）', () => {
  assert.match(source, /timeNote\?: string/)
})

test('toRhythmInsight 签名含 createdAt 第 4 参（B8：created_at 必须传进 mapper）', () => {
  assert.match(source, /function toRhythmInsight\(\s*card: RhythmCard \| null \| undefined,\s*slot: string,\s*targetDate: string,\s*createdAt\?: string,/)
})

test('RhythmInsightCondition 接口含 direction / positionAction / anchor 字段', () => {
  assert.match(source, /direction\?: ['"]bullish['"] \| ['"]bearish['"] \| ['"]neutral['"]/)
  assert.match(source, /positionAction\?:/)
  assert.match(source, /anchor\?:/)
})

test('title：中性沿用的档位标注「中性沿用」，不与硬判混淆', () => {
  const card = {
    position_index: 1,
    position_band: { text: '建议仓位：轻仓（≤三成）' },
    phase_evidence: { stage_source: 'inherited_prev_day' },
    conflict: false,
    branches: [],
  } as unknown as RhythmCard
  assert.equal(toRhythmInsight(card, 'after_close', '2026-11-02')?.title, '轻仓（≤三成）')
})

test('title：computed 硬判不加沿用标注', () => {
  const card = {
    position_index: 0,
    position_band: { text: '建议仓位：空仓观望' },
    phase_evidence: { stage_source: 'computed' },
    conflict: false,
    branches: [],
  } as unknown as RhythmCard
  assert.equal(toRhythmInsight(card, 'after_close', '2026-11-02')?.title, '空仓观望')
})

test('trace 取 causality_text（lead + lines 用「；」连接），不再取 phase_evidence.reason', () => {
  const card = makeCard({
    causality_text: {
      lead: '两个条件同时卡着，只解决一个也还不能加仓',
      lines: ['指数 3689.91 点跌破 20 日均线 3701.53 点', '没有板块近 5 天超额领先第二名 2.0 个百分点以上'],
    },
    phase_evidence: { reason: '主线：无清晰主线｜指数破位' },
  })
  const out = toRhythmInsight(card, 'after_close', '2026-11-06')!
  assert.equal(
    out.trace,
    '两个条件同时卡着，只解决一个也还不能加仓；指数 3689.91 点跌破 20 日均线 3701.53 点；没有板块近 5 天超额领先第二名 2.0 个百分点以上',
  )
  assert.ok(!String(out.trace).includes('指数破位'))
})

test('trace 同时包含 lead 与全部 lines 片段', () => {
  const card = makeCard({
    causality_text: { lead: 'A', lines: ['B', 'C'] },
  })
  const out = toRhythmInsight(card, 'after_close', '2026-11-06')!
  for (const piece of ['A', 'B', 'C']) assert.ok(out.trace!.includes(piece))
})

test('lines：变更行取 delta_narrative，after_close 标签是「较昨日」', () => {
  const card = makeCard({
    delta: {
      prev: { target_date: '2026-11-05', slot: 'after_close', lag_days: 1 },
      position: { from_index: 0, to_index: 0, changed: false },
      default_key: 'gate',
      gaps: [{ key: 'gate', from_gap: 21.53, to_gap: 11.62, unit: '点' }],
    },
    delta_narrative: '离加仓还差 11.62 点，仓位仍是空仓观望',
  })
  const out = toRhythmInsight(card, 'after_close', '2026-11-06')!
  assert.deepEqual(out.lines?.[0], { key: '较昨日', text: '离加仓还差 11.62 点，仓位仍是空仓观望' })
})

test('morning 标签「较昨收」、midday 标签「较早盘」', () => {
  const card = makeCard({
    delta: { prev: { target_date: 't', slot: 'after_close' }, position: {}, default_key: 'none' },
    delta_narrative: '仓位维持空仓观望',
  })
  assert.equal(toRhythmInsight(card, 'morning', '2026-11-06')!.lines?.[0].key, '较昨收')
  assert.equal(toRhythmInsight(card, 'midday', '2026-11-06')!.lines?.[0].key, '较早盘')
})

test('lag_days > 1 时标签写「较 N 个交易日前」，不得伪称「较昨日」', () => {
  const card = makeCard({
    delta: { prev: { target_date: 't', slot: 'after_close', lag_days: 3 }, position: {}, default_key: 'none' },
    delta_narrative: '仓位维持空仓观望',
  })
  assert.equal(toRhythmInsight(card, 'after_close', '2026-11-06')!.lines?.[0].key, '较 3 个交易日前')
})

test('复盘行：只陈述事实，key 是「昨日」；up_ratio 缺失时不留半句', () => {
  const card = makeCard({
    delta: {
      prev: { target_date: '2026-11-05', slot: 'after_close', lag_days: 1 },
      position: { from_index: 0, to_index: 0 },
      review: { prev_target_date: '2026-11-05', prev_position_text: '建议仓位：轻仓~三成', index_pct_chg: -0.62, up_ratio: null },
    },
    delta_narrative: '离加仓还差 11.62 点，仓位仍是空仓观望',
  })
  const out = toRhythmInsight(card, 'after_close', '2026-11-06')!
  assert.deepEqual(out.lines?.[1], { key: '昨日', text: '昨日说轻仓~三成，昨天上证 -0.62%' })
})

test('复盘行：有 up_ratio 时补「N% 的股票上涨」', () => {
  const card = makeCard({
    delta: {
      prev: { target_date: '2026-11-05', slot: 'after_close' },
      position: {},
      review: { prev_target_date: '2026-11-05', prev_position_text: '空仓观望', index_pct_chg: 1.2, up_ratio: 41.4 },
    },
  })
  const out = toRhythmInsight(card, 'after_close', '2026-11-06')!
  assert.deepEqual(out.lines?.[0], { key: '昨日', text: '昨日说空仓观望，昨天上证 +1.20%，41% 的股票上涨' })
})

test('旧卡（无 delta）不渲染变更行，也不报错', () => {
  const out = toRhythmInsight(makeCard({}), 'after_close', '2026-11-06')!
  assert.equal(out.lines, undefined)
})

test('lines 的 key 只有「较昨日/较昨收/较早盘」与「昨日」两类，不许出现「原因/依据」', () => {
  const card = makeCard({
    delta: {
      prev: { target_date: 't', slot: 'after_close', lag_days: 1 },
      position: {},
      review: { prev_target_date: 't', prev_position_text: '空仓观望', index_pct_chg: 0, up_ratio: null },
    },
    delta_narrative: '仓位维持空仓观望',
  })
  const out = toRhythmInsight(card, 'after_close', '2026-11-06')!
  const allowed = new Set(['较昨日', '较昨收', '较早盘', '昨日'])
  for (const line of out.lines ?? []) {
    assert.ok(allowed.has(line.key) || /^较 \d+ 个交易日前$/.test(line.key), line.key)
  }
})

test('影子期渲染开关默认关闭（转正时才改 true 发版）', () => {
  assert.equal(RHYTHM_DELTA_UI, false)
})
