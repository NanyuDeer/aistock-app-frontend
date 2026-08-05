import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CapitalFlowCard from './CapitalFlowCard.vue'
import type { ChatCard } from '@/shared/api/modules/agent'

describe('CapitalFlowCard', () => {
  const card: ChatCard = {
    card_type: 'capital_flow',
    title: '资金流向',
    data: {
      main_in: 1.2e8,
      main_out: 8.5e7,
      net_amount: 3.5e7,
      flow_5d: [
        { label: '08-01', value: 2.5e7 },
        { label: '08-02', value: -1.2e7 },
        { label: '08-03', value: 3.8e7 },
      ],
    },
  }

  it('渲染主力流入/流出双格 + 净额', () => {
    const wrapper = mount(CapitalFlowCard, { props: { card } })
    expect(wrapper.text()).toContain('主力流入')
    expect(wrapper.text()).toContain('1.2亿')
    expect(wrapper.text()).toContain('主力流出')
    expect(wrapper.text()).toContain('0.9亿')
    expect(wrapper.text()).toContain('净额 +35000000')
  })

  it('flow_5d 空数组不渲染柱状区', () => {
    const wrapper = mount(CapitalFlowCard, { props: { card: { ...card, data: { main_in: 1, main_out: 2, net_amount: 3, flow_5d: [] } } } })
    expect(wrapper.find('.cf-bars').exists()).toBe(false)
  })

  it('data 全缺时不渲染', () => {
    const wrapper = mount(CapitalFlowCard, { props: { card: { ...card, data: {} } } })
    expect(wrapper.find('.cf-card').exists()).toBe(false)
  })
})
