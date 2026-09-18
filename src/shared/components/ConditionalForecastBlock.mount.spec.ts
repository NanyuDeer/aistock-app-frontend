/**
 * ConditionalForecastBlock 挂载态护栏（vitest + happy-dom）。
 *
 * 背景：折叠/过滤必须按 `displayMode` 收口——
 * - `conclusion`（sector-detail / sector-loop / traceability）：三态 = 未触发折叠 / 只显已成立分支 / 到期未触发+「未命中」；
 * - `full`（节奏大师等未传 display-mode 的调用方）：恒全量分支直显 + 无折叠入口。
 * 源码锚定 spec（同目录 .spec.ts，node:test）只能验"代码长什么样"，验不了"渲染出什么"；
 * 本 spec 补渲染结果护栏，防"折叠口径反转"漏网（full 被折叠 → 卡内只剩一行入口 = 零内容）。
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConditionalForecastBlock from './ConditionalForecastBlock.vue'

/** 分支卡节点（`.as-insight-card__sc`；CSS 类选择器为整词匹配，不含 __sc-list/__sc-chip 等同前缀节点） */
const BRANCH = '.as-insight-card__sc'
/** 折叠入口行 */
const FOLD = '.as-insight-card__sc-fold'

type Horizon = 'short' | 'mid' | 'long'

interface CondSeed {
  condition: string
  scenario: string
  label: string
  keywords: string[]
  scenario_keywords: string[]
  /** 缺省 = 该条未写 met（未触发档的真实形态，决策 D1：只写 true、不写 false） */
  met?: boolean | null
}

interface Structured {
  horizons: Array<{ horizon: Horizon; label: string; direction: 'bearish'; confidence: 'medium' }>
  conditions: Array<CondSeed & { horizon: Horizon }>
  verification?: 'pending' | 'hit' | 'miss'
}

/** 单档（short）第 n 条条件种子 */
const cond = (n: number, met?: boolean | null): CondSeed => ({
  condition: `若放量站上 ${n} 日线`,
  scenario: `则上探 +${n}%`,
  label: `情景${n}`,
  keywords: [`站上${n}日线`],
  scenario_keywords: [`+${n}%`],
  ...(met === undefined ? {} : { met }),
})

const structured = (conditions: CondSeed[], verification?: Structured['verification']): Structured => ({
  horizons: [{ horizon: 'short', label: '宽度收缩为主', direction: 'bearish', confidence: 'medium' }],
  conditions: conditions.map((c) => ({ ...c, horizon: 'short' })),
  ...(verification ? { verification } : {}),
})

/** 挂载：不传 displayMode = 组件默认 full（节奏大师等调用方形态） */
const mountCfb = (
  conditions: CondSeed[],
  displayMode?: 'full' | 'conclusion',
  verification?: Structured['verification'],
) =>
  displayMode
    ? mount(ConditionalForecastBlock, {
        props: { structured: structured(conditions, verification), displayMode },
      })
    : mount(ConditionalForecastBlock, {
        props: { structured: structured(conditions, verification) },
      })

describe('ConditionalForecastBlock 折叠/过滤按 displayMode 收口', () => {
  it('conclusion + 该档全无 met → 渲染折叠入口，且条件分支节点为 0', () => {
    const wrapper = mountCfb([cond(1), cond(2)], 'conclusion')

    expect(wrapper.find(FOLD).exists()).toBe(true)
    expect(wrapper.findAll(BRANCH)).toHaveLength(0)
  })

  it('conclusion + 点击折叠入口 → 铺开该档全部条件分支（计数 == 该档 conditions 数）', async () => {
    const wrapper = mountCfb([cond(1), cond(2)], 'conclusion')
    expect(wrapper.findAll(BRANCH)).toHaveLength(0)

    await wrapper.find(FOLD).trigger('tap')

    expect(wrapper.findAll(BRANCH)).toHaveLength(2)
  })

  it('conclusion + 一条 met:true → 「条件成立」徽 + 无折叠入口 + 「另有 1 条条件未成立」', () => {
    const wrapper = mountCfb([cond(1, true), cond(2)], 'conclusion')

    expect(wrapper.findAll(BRANCH)).toHaveLength(1)
    expect(wrapper.find('.as-insight-card__sc-live').text()).toBe('条件成立')
    expect(wrapper.find(FOLD).exists()).toBe(false)
    expect(wrapper.find('.as-insight-card__sc-hidden-tx').text()).toBe('另有 1 条条件未成立')
  })

  it('conclusion + verification=miss + 折叠态 → 入口行「未命中」，头部 verify pill 不渲染', () => {
    const wrapper = mountCfb([cond(1), cond(2)], 'conclusion', 'miss')

    expect(wrapper.find(FOLD).exists()).toBe(true)
    expect(wrapper.find('.as-insight-card__sc-miss').text()).toBe('未命中')
    expect(wrapper.find('.as-insight-card__verify').exists()).toBe(false)
  })

  it('conclusion + 到期未触发（条件显式 met:false）→ 折叠态 + 「未命中」+ 无空态文案', () => {
    // Task 6.1 新形态：到期对未触发条件写 condition_met=false（此前只写 true，未触发档
    // 没有任何布尔 met）。三态判定按「当期有无已成立分支」收口，与 met 是 false 还是缺省无关：
    // 仍为折叠态 + 「未命中」，且**不得**落到空态文案（空态仅在无任何分支可渲染时出现，
    // 折叠态优先——既有 2026-09-17 决议）。
    const wrapper = mountCfb([cond(1, false), cond(2, false)], 'conclusion', 'miss')

    expect(wrapper.find(FOLD).exists()).toBe(true)
    expect(wrapper.find('.as-insight-card__sc-miss').text()).toBe('未命中')
    expect(wrapper.findAll(BRANCH)).toHaveLength(0)
    expect(wrapper.text()).not.toContain('条件未成立 · 暂无已验证结论')
  })

  it('full（含不传 display-mode）→ 全量分支 + 无折叠入口（防 full 被折叠的回归护栏）', () => {
    for (const wrapper of [mountCfb([cond(1), cond(2)], 'full'), mountCfb([cond(1), cond(2)])]) {
      expect(wrapper.findAll(BRANCH)).toHaveLength(2)
      expect(wrapper.find(FOLD).exists()).toBe(false)
    }
  })
})
