import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CardRenderer from './CardRenderer.vue'
import MarketSnapshotCard from './MarketSnapshotCard.vue'
import StockSnapshotCard from './StockSnapshotCard.vue'
import CapitalFlowCard from './CapitalFlowCard.vue'
import DeepAnalysisCard from './DeepAnalysisCard.vue'
import ComparisonCard from './ComparisonCard.vue'
import type { ChatCard } from '@/shared/api/modules/agent'

describe('CardRenderer', () => {
  const cards: ChatCard[] = [
    { card_type: 'market_snapshot', title: '大盘', data: { indices: [] } },
    { card_type: 'stock_snapshot', title: '个股', data: { name: '贵州茅台' } },
    { card_type: 'capital_flow', title: '资金', data: { main_in: 1 } },
    { card_type: 'deep', title: '深度', data: { summary: '深度摘要' } },
    { card_type: 'comparison', title: '对比', data: { conclusion: '结论' } },
  ]

  it('按 card_type 路由渲染 5 类卡片', () => {
    const wrapper = mount(CardRenderer, { props: { cards } })
    expect(wrapper.findComponent(MarketSnapshotCard).exists()).toBe(true)
    expect(wrapper.findComponent(StockSnapshotCard).exists()).toBe(true)
    expect(wrapper.findComponent(CapitalFlowCard).exists()).toBe(true)
    expect(wrapper.findComponent(DeepAnalysisCard).exists()).toBe(true)
    expect(wrapper.findComponent(ComparisonCard).exists()).toBe(true)
  })

  it('未知 card_type 不渲染对应块（仅已知类型渲染）', () => {
    const wrapper = mount(CardRenderer, {
      props: { cards: [
        { card_type: 'market_snapshot', title: '大盘', data: { indices: [] } },
        { card_type: 'unknown_type', title: 'x', data: {} } as unknown as ChatCard,
      ] },
    })
    expect(wrapper.findComponent(MarketSnapshotCard).exists()).toBe(true)
    expect(wrapper.findComponent(StockSnapshotCard).exists()).toBe(false)
  })

  it('全未知类型时不渲染容器（等价 null）', () => {
    const wrapper = mount(CardRenderer, {
      props: { cards: [{ card_type: 'unknown_type', title: 'x', data: {} } as unknown as ChatCard] },
    })
    expect(wrapper.find('.card-renderer').exists()).toBe(false)
  })

  it('cards 空/undefined 时不渲染容器', () => {
    const empty = mount(CardRenderer, { props: { cards: [] } })
    expect(empty.find('.card-renderer').exists()).toBe(false)
    const undef = mount(CardRenderer, { props: { cards: undefined } })
    expect(undef.find('.card-renderer').exists()).toBe(false)
  })
})
