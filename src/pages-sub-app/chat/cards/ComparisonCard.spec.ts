import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ComparisonCard from './ComparisonCard.vue'
import type { ChatCard } from '@/shared/api/modules/agent'

describe('ComparisonCard', () => {
  const card: ChatCard = {
    card_type: 'comparison',
    title: '标的对比',
    data: {
      stocks: [
        { name: '贵州茅台', code: '600519', price: 1688.5, change: 12.3, change_pct: 0.73, available: true },
        { name: '五粮液', code: '000858', price: 145.2, change: -1.8, change_pct: -1.22, available: false },
      ],
      conclusion: '茅台强于五粮液。',
    },
  }

  it('渲染双标的行情卡 + 涨跌幅 + AI 结论', () => {
    const wrapper = mount(ComparisonCard, { props: { card } })
    expect(wrapper.text()).toContain('贵州茅台')
    expect(wrapper.text()).toContain('五粮液')
    expect(wrapper.text()).toContain('+0.73%')
    expect(wrapper.text()).toContain('-1.22%')
    expect(wrapper.text()).toContain('茅台强于五粮液。')
  })

  it('available=false 标的灰显（.cmp-stock-unavailable）', () => {
    const wrapper = mount(ComparisonCard, { props: { card } })
    expect(wrapper.find('.cmp-stock-unavailable').exists()).toBe(true)
  })

  it('缺 stocks/conclusion 时容错', () => {
    const wrapper = mount(ComparisonCard, { props: { card: { ...card, data: {} } } })
    expect(wrapper.find('.cmp-card').exists()).toBe(false)
  })
})
