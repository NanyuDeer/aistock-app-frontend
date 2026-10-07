/**
 * MarketTracePrediction 档位信息单一来源护栏（vitest + happy-dom）。
 *
 * 背景（spec §4.8 / Task 9）：本卡曾把档位信息渲染两遍——共享块 ConditionalForecastBlock
 * （`condStructured` 里带 `horizons`）+ 紧随其后的自写平铺块（`.horizon-item` v-for）。
 * Task 8 已把共享块档位区改为平铺，故删除自写块，同一张卡内档位只由共享块渲染一次。
 *
 * 关键陷阱（计划漏项）：条件化预判退役后，新记录 `conditions` 恒为 `[]`（Task 6 起 prompt
 * 不再产出 conditions）。若共享块仍以 `conditions.length > 0` 为渲染门槛，删掉自写块后
 * 大盘卡将彻底失去档位信息——故门槛必须改「有档位 或 有条件」。第 2 条用例即该回归护栏。
 *
 * 第二点：自写块还渲染了共享块原本没有的 `target`（目标位）与 `phase`（影响阶段）；
 * 收敛后这两个**既有信息**必须继续由共享块字段驱动渲染（有值渲染、无值整行跳过）。
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MarketTracePrediction from './MarketTracePrediction.vue'
import type { PredictionPresentation, PredictionHorizonPresentation } from '../utils/marketTraceReview'

const horizon = (over: Partial<PredictionHorizonPresentation> = {}): PredictionHorizonPresentation => ({
  horizon: 'short',
  label: '宽度收缩',
  remainingEstimate: '1-5 交易日',
  phase: 'building',
  direction: 'bullish',
  target: '上探 3300',
  metricProjection: '到期窗口累计同向即命中',
  confidence: 'high',
  ...over,
})

const prediction = (over: Partial<PredictionPresentation> = {}): PredictionPresentation => ({
  status: 'confirmed',
  horizons: [
    horizon(),
    horizon({
      horizon: 'mid',
      label: '动能衰减',
      phase: 'peaking',
      direction: 'bearish',
      target: '下探 3100',
      confidence: 'medium',
    }),
  ],
  conditions: [],
  evolutionSteps: [],
  evolutionNarrative: '',
  risks: [],
  attributionSummary: null,
  ...over,
})

describe('MarketTracePrediction 档位信息只渲染一次（spec §4.8）', () => {
  it('两档 → 共享块渲染 2 行，自写平铺块 .horizon-item 不存在', () => {
    const wrapper = mount(MarketTracePrediction, { props: { prediction: prediction() } })

    expect(wrapper.findAll('.as-insight-card__horizon-row')).toHaveLength(2)
    expect(wrapper.find('.horizon-item').exists()).toBe(false)
  })

  it('conditions 为空但 horizons 非空 → 共享块仍渲染档位行（条件退役后不得丢档位）', () => {
    const wrapper = mount(MarketTracePrediction, {
      props: { prediction: prediction({ conditions: [] }) },
    })

    expect(wrapper.findAll('.as-insight-card__horizon-row')).toHaveLength(2)
    expect(wrapper.text()).toContain('短期')
  })

  it('大盘既有信息 target / phase 仍渲染（字段驱动，不回归）', () => {
    const wrapper = mount(MarketTracePrediction, { props: { prediction: prediction() } })

    expect(wrapper.findAll('.as-insight-card__horizon-target')).toHaveLength(2)
    expect(wrapper.find('.as-insight-card__horizon-target').text()).toBe('上探 3300')
    expect(wrapper.findAll('.as-insight-card__horizon-phase')).toHaveLength(2)
    expect(wrapper.text()).toContain('影响形成')
    expect(wrapper.text()).toContain('影响高峰')
  })
})
