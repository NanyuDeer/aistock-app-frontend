import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RhythmCard from './RhythmCard.vue'
import { toRhythmInsight } from '../utils/rhythmInsight'
import type { RhythmCard as RhythmCardData, RhythmPositionLedger } from '@/shared/api/modules/agent'

/**
 * T10 变奏观察点 / 折叠账本渲染契约（spec §5.2 / §6 / §8），
 * 以及溯源已并入洞见卡后详情卡不再重复渲染（spec §8.2）。
 *
 * 为什么是挂载测试而非源码正则：本批三条渲染规则都是「有则渲染、无则整块消失、超限截断、
 * 缺数据显式标注」的**条件渲染**语义，源码正则无法证明 DOM 真的没有空壳。
 */

/** 后端样例账本（与 spec / 任务书样例逐字一致，用于验证「原样展示」） */
const SAMPLE_LEDGER: RhythmPositionLedger = {
  items: [
    { key: 'trend', value_text: '3590.00 / ma20 3620.00', judgement: '闸门命中', effect: 'base→0，禁止 +1', status: 'blocking' },
    { key: 'mainline', value_text: '无清晰主线（最高超额 +0.8pct）', judgement: '未成立', effect: 'base 强制 0', status: 'blocking' },
    { key: 'event', value_text: 'd=3，窗口外', judgement: '无修正', effect: '不改档', status: 'neutral' },
    { key: 'breadth', value_text: '上涨占比 45%', judgement: '中性', effect: '仅参与 certainty', status: 'neutral' },
  ],
  base_index: 0,
  adjust: 0,
  final_index: 0,
  gate_hit: true,
  mainline_breakdown: null,
  insufficient: false,
  gate_blocked: true,
  mainline_state: 'none',
  ledger_version: '1.0',
  watch_points: [
    {
      key: 'gate',
      condition: '收盘站上 3620.00 且 ma5 回到 ma10 上方',
      current_text: '收盘 3590.00（差 30.00 点）',
      sufficient_alone: false,
      candidates: null,
    },
    {
      key: 'mainline',
      condition: '某板块 5 日超额领先第 2 名 ≥2.0pct',
      current_text: '领先第 2 名 +1.20pct（需 ≥2.0）',
      sufficient_alone: false,
      candidates: [
        { name: 'AI 算力', excess: 24.2 },
        { name: '半导体', excess: 23.1 },
      ],
    },
  ],
}

const SAMPLE_CAUSALITY = {
  lead: '两条闸门同时压到底，任一解除都不能升档',
  lines: [
    '指数 3590.00 跌破 20 日线 3620.00，且均线空头排列',
    '无板块 5 日超额领先第 2 名 ≥2.0pct，主线未成立',
  ],
}

function makeCard(p: Partial<RhythmCardData> = {}): RhythmCardData {
  return {
    position_index: 0,
    position_band: { text: '建议仓位：空仓观望' },
    temperature_series: [],
    event_window: [],
    conflict: false,
    branches: [],
    ...p,
  }
}

function mountCard(card: RhythmCardData) {
  return mount(RhythmCard, { props: { card } })
}

describe('变奏 / 账本：完整数据', () => {
  it('变奏与账本渲染，溯源文案不再出现在详情卡（已并入洞见卡）', () => {
    const wrapper = mountCard(makeCard({ position_ledger: SAMPLE_LEDGER, causality_text: SAMPLE_CAUSALITY }))

    // 溯源（spec §8.2）：同一件事只说一遍，详情卡整块不再渲染
    expect(wrapper.find('.rc-trace').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('溯源')
    expect(wrapper.text()).not.toContain(SAMPLE_CAUSALITY.lead)
    for (const line of SAMPLE_CAUSALITY.lines) expect(wrapper.text()).not.toContain(line)

    // 变奏块：condition 主文本 + current_text 次文本原样
    const watch = wrapper.find('.rc-watch')
    expect(watch.exists()).toBe(true)
    expect(watch.text()).toContain('变奏观察点')
    for (const wp of SAMPLE_LEDGER.watch_points ?? []) {
      expect(watch.text()).toContain(wp.condition)
      expect(watch.text()).toContain(wp.current_text)
    }
    // 候选池并列（名称 + 超额）
    expect(watch.text()).toContain('AI 算力 +24.2pct · 半导体 +23.1pct')

    // 折叠账本：默认收起，只留一行摘要
    const ledger = wrapper.find('.rc-ledger')
    expect(ledger.exists()).toBe(true)
    expect(ledger.text()).toContain('展开依据 · 仓位账本（4 项输入）')
    expect(ledger.findAll('.rc-ledger-item')).toHaveLength(0)
  })

  it('展开账本后 4 行，judgement / value_text / effect 逐字一致', async () => {
    const wrapper = mountCard(makeCard({ position_ledger: SAMPLE_LEDGER }))
    await wrapper.find('.rc-ledger-head').trigger('tap')

    const rows = wrapper.findAll('.rc-ledger-item')
    expect(rows).toHaveLength(4)
    SAMPLE_LEDGER.items.forEach((item, i) => {
      const text = rows[i].text()
      expect(text).toContain(item.judgement)
      expect(text).toContain(item.value_text)
      expect(text).toContain(item.effect)
    })
    expect(wrapper.find('.rc-ledger').text()).toContain('收起依据 · 仓位账本')
  })

  it('双阻塞（gate_blocked + mainline_state=none）→ 变奏块头含「两条须同时满足才回到轻仓」', () => {
    const wrapper = mountCard(makeCard({ position_ledger: SAMPLE_LEDGER }))
    const alert = wrapper.find('.rc-watch-alert')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('两条须同时满足才回到轻仓')
  })

  it('不再渲染溯源块（已合并到洞见卡）', () => {
    const wrapper = mountCard(makeCard({ position_ledger: SAMPLE_LEDGER, causality_text: SAMPLE_CAUSALITY }))
    expect(wrapper.find('.rc-trace').exists()).toBe(false)
  })
})

describe('降级（spec §8）', () => {
  it('position_ledger 为 null → 溯源 / 变奏 / 账本三块都不渲染（无空壳）', () => {
    const wrapper = mountCard(makeCard({ position_ledger: null, causality_text: SAMPLE_CAUSALITY }))
    expect(wrapper.find('.rc-trace').exists()).toBe(false)
    expect(wrapper.find('.rc-watch').exists()).toBe(false)
    expect(wrapper.find('.rc-ledger').exists()).toBe(false)
    const text = wrapper.text()
    expect(text).not.toContain('溯源')
    expect(text).not.toContain('变奏观察点')
    expect(text).not.toContain('仓位账本')
  })

  it('causality_text 为 null + ledger 存在 → 只渲染变奏块与账本', () => {
    const wrapper = mountCard(makeCard({ position_ledger: SAMPLE_LEDGER, causality_text: null }))
    expect(wrapper.find('.rc-trace').exists()).toBe(false)
    expect(wrapper.find('.rc-watch').exists()).toBe(true)
    expect(wrapper.find('.rc-ledger').exists()).toBe(true)
  })

  it('旧报告（无任何新字段）→ 不抛错、三块不渲染、主视觉照常', () => {
    const wrapper = mountCard(makeCard())
    expect(wrapper.find('.rc-trace').exists()).toBe(false)
    expect(wrapper.find('.rc-watch').exists()).toBe(false)
    expect(wrapper.find('.rc-ledger').exists()).toBe(false)
    expect(wrapper.find('.rc-pos-main').text()).toBe('建议仓位：空仓观望')
  })
})

describe('缺失与截断', () => {
  it('status=missing 的行显示「数据不可用」且该行仍然存在', async () => {
    // 取后端真实形态（rhythm_engine._build_event_ledger_item）：judgement「数据缺失」不含「数据不可用」，
    // value_text 亦为缺失原因文案 —— 因此「数据不可用」必须是前端显式标注，不能靠文案巧合。
    const ledger: RhythmPositionLedger = {
      ...SAMPLE_LEDGER,
      items: [
        SAMPLE_LEDGER.items[0],
        { key: 'event', value_text: '无事件 / d 不可用', judgement: '数据缺失', effect: '不改档', status: 'missing' },
        SAMPLE_LEDGER.items[2],
        { key: 'breadth', value_text: '上涨占比不可用', judgement: '数据不可用', effect: '仅参与 certainty，不改档', status: 'missing' },
      ],
    }
    const wrapper = mountCard(makeCard({ position_ledger: ledger }))
    await wrapper.find('.rc-ledger-head').trigger('tap')

    // 行不隐藏：4 项输入全部在
    const rows = wrapper.findAll('.rc-ledger-item')
    expect(rows).toHaveLength(4)
    const missing = wrapper.findAll('.rc-ledger-item--missing')
    expect(missing).toHaveLength(2)
    for (const row of missing) expect(row.text()).toContain('数据不可用')
    // 原始文案不因 missing 被替换/丢弃
    expect(rows[1].text()).toContain('无事件 / d 不可用')
    expect(rows[1].text()).toContain('数据缺失')
  })

  it('temperature_note 有值 → 展开账本内出现温度因子行，且不计入 4 项账本输入', async () => {
    const wrapper = mountCard(makeCard({
      position_ledger: SAMPLE_LEDGER,
      temperature_note: '情绪温度 62.4（近 3 日 +8.2）',
    }))
    // 收起态摘要的计数只统计账本输入项，温度行不得让它变成「5 项」
    expect(wrapper.find('.rc-ledger-head').text()).toContain('4 项输入')

    await wrapper.find('.rc-ledger-head').trigger('tap')

    const note = wrapper.find('.rc-ledger-note')
    expect(note.exists()).toBe(true)
    expect(note.text()).toContain('温度因子')
    expect(note.text()).toContain('情绪温度 62.4（近 3 日 +8.2）')
    expect(note.text()).toContain('不影响仓位')
    // 关键：温度行不进 4 项输入计数，否则「仓位账本（4 项输入）」摘要会与实际不符
    expect(wrapper.findAll('.rc-ledger-item')).toHaveLength(4)
  })

  it('temperature_note 缺失（无归档）→ 温度行整条不渲染，不留空标签', async () => {
    const wrapper = mountCard(makeCard({ position_ledger: SAMPLE_LEDGER }))
    await wrapper.find('.rc-ledger-head').trigger('tap')
    expect(wrapper.find('.rc-ledger-note').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('温度因子')
  })

  it('watch_points 超过 3 条 → 只渲染前 3 条', () => {
    const wp = {
      key: 'gate' as const,
      condition: '条件',
      current_text: '当前',
      sufficient_alone: false,
    }
    const ledger: RhythmPositionLedger = {
      ...SAMPLE_LEDGER,
      watch_points: [
        { ...wp, condition: '条件一' },
        { ...wp, condition: '条件二' },
        { ...wp, condition: '条件三' },
        { ...wp, condition: '条件四' },
      ],
    }
    const wrapper = mountCard(makeCard({ position_ledger: ledger }))
    const items = wrapper.findAll('.rc-watch-item')
    expect(items).toHaveLength(3)
    expect(wrapper.find('.rc-watch').text()).not.toContain('条件四')
  })

  it('watch_points 为空 → 变奏块不渲染（不留空标签）', () => {
    const wrapper = mountCard(makeCard({ position_ledger: { ...SAMPLE_LEDGER, watch_points: [] } }))
    expect(wrapper.find('.rc-watch').exists()).toBe(false)
    // 账本仍在（ledger 非空）
    expect(wrapper.find('.rc-ledger').exists()).toBe(true)
  })
})

describe('标题第二段：suppressReason 纯映射（spec §4）', () => {
  const base = { position_index: 0, position_band: { text: '建议仓位：空仓观望' }, conflict: false, branches: [] }

  function titleOf(ledger: RhythmPositionLedger | null | undefined): string | undefined {
    return toRhythmInsight(makeCard({ ...base, position_ledger: ledger }), 'after_close', '2026-11-04')?.title
  }

  it('gate_blocked + mainline_state=none → 两个条件都卡着', () => {
    expect(titleOf({ ...SAMPLE_LEDGER, gate_blocked: true, mainline_state: 'none' })).toBe('空仓观望 · 两个条件都卡着')
  })

  it('仅 gate_blocked → 关键条件卡着', () => {
    expect(titleOf({ ...SAMPLE_LEDGER, gate_blocked: true, mainline_state: 'established' })).toBe('空仓观望 · 关键条件卡着')
  })

  it('仅 mainline_state=none → 无主线', () => {
    expect(titleOf({ ...SAMPLE_LEDGER, gate_blocked: false, mainline_state: 'none' })).toBe('空仓观望 · 无主线')
  })

  it('其他（无压制）→ 退化为纯仓位，不补分隔符', () => {
    expect(titleOf({ ...SAMPLE_LEDGER, gate_blocked: false, mainline_state: 'established' })).toBe('空仓观望')
  })

  it('ledger 为 null / 缺失（旧报告）→ 退化为纯仓位', () => {
    expect(titleOf(null)).toBe('空仓观望')
    expect(titleOf(undefined)).toBe('空仓观望')
  })
})
