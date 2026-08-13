import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeepAnalysisCard from './DeepAnalysisCard.vue'
import type { ChatCard } from '@/shared/api/modules/agent'

describe('DeepAnalysisCard', () => {
  const card: ChatCard = {
    card_type: 'deep',
    title: '深度分析',
    data: {
      worker: 'stock',
      report_id: 'r1',
      question: '分析贵州茅台',
      summary: '公司基本面稳健，估值处于历史中位。',
      symbols: ['600519', '000858'],
      tag_codes: ['白酒', '消费'],
      created_at: '2026-08-05T10:00:00+08:00',
    },
  }

  it('渲染 worker 标签 / summary / symbols 标签', () => {
    const wrapper = mount(DeepAnalysisCard, { props: { card } })
    expect(wrapper.text()).toContain('深度分析')
    expect(wrapper.text()).toContain('个股')
    expect(wrapper.text()).toContain('公司基本面稳健')
    expect(wrapper.text()).toContain('600519')
    expect(wrapper.text()).toContain('白酒')
  })

  it('缺 summary/symbols 时容错（头部仍渲染）', () => {
    const wrapper = mount(DeepAnalysisCard, {
      props: { card: { ...card, data: { worker: 'hot_burst' } } },
    })
    expect(wrapper.find('.da-header').exists()).toBe(true)
  })
})
