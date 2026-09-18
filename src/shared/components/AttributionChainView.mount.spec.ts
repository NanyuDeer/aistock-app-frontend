/**
 * 大盘归因链视图「未确认驱动原因」节点过滤护栏（vitest + happy-dom，2026-09-18 R17）。
 *
 * 口径与市场洞见页「今日影响大盘的主要板块」区块同源（`sectorInsight.isUnconfirmedAttribution`）：
 * `trace_summary` 去空白后为空、或命中中性/未确认表述（如「未确认驱动原因」）→ 该 children 不渲染
 * （events[] 里常是「沪指跌0.41%…」这类行情综述=现象，不是驱动原因，故无条件按摘要判）。
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AttributionChainView from './AttributionChainView.vue'

const DATE = '2026-09-17'

/** 链：3 个 children，其中 2 个为「未确认驱动原因」（含纯空白摘要） */
const chainFixture = {
  date: DATE,
  root: {
    type: 'market' as const,
    date: DATE,
    summary: '证据不足，未确认主因',
    index_pct: -0.411,
    evidence_weak: true,
  },
  children: [
    { sector: 'CRO概念', relation: 'market_follow' as const, pct: 2.09, trace_summary: '未确认驱动原因' },
    { sector: '转基因', relation: 'market_follow' as const, pct: 4.04, trace_summary: '  ' },
    {
      sector: '玉米',
      relation: 'self_driven' as const,
      pct: 3.74,
      trace_summary: '玉米期货走强带动种植链',
    },
  ],
}

describe('AttributionChainView 未确认驱动原因过滤（R17）', () => {
  it('未确认驱动原因的 children 不渲染（仅保留确认节点）', () => {
    const wrapper = mount(AttributionChainView, { props: { date: DATE, chain: chainFixture } })

    expect(wrapper.findAll('.acv-child')).toHaveLength(1)
    expect(wrapper.find('.acv-sec').text()).toBe('玉米')
    expect(wrapper.find('.acv-driver').text()).toBe('玉米期货走强带动种植链')
    expect(wrapper.text()).not.toContain('CRO概念')
    expect(wrapper.text()).not.toContain('转基因')
  })

  it('大盘根照常渲染（过滤只作用于 children，不影响 root）', () => {
    const wrapper = mount(AttributionChainView, { props: { date: DATE, chain: chainFixture } })

    expect(wrapper.find('.acv-root-sum').text()).toBe('证据不足，未确认主因')
  })
})
