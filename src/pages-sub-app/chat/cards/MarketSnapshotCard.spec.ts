import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MarketSnapshotCard from './MarketSnapshotCard.vue'
import type { ChatCard } from '@/shared/api/modules/agent'

describe('MarketSnapshotCard', () => {
  const card: ChatCard = {
    card_type: 'market_snapshot',
    title: '大盘行情',
    data: {
      indices: [
        { index_name: '上证指数', code: '000001', value: 3832.26, change: 27.3, change_pct: 0.72 },
        { index_name: '深证成指', code: '399001', value: 12001.5, change: -60.2, change_pct: -0.5 },
      ],
      up_count: 3200,
      flat_count: 150,
      down_count: 1800,
      trade_date: '2026-08-05',
    },
  }

  it('渲染主指数 + 其余指数列表 + 涨跌家数三栏 + 日期', () => {
    const wrapper = mount(MarketSnapshotCard, { props: { card } })
    expect(wrapper.text()).toContain('大盘行情')
    expect(wrapper.text()).toContain('上证指数')
    expect(wrapper.text()).toContain('3832.26')
    expect(wrapper.text()).toContain('+0.72%')
    expect(wrapper.text()).toContain('深证成指')
    expect(wrapper.text()).toContain('-0.50%')
    expect(wrapper.text()).toContain('上涨')
    expect(wrapper.text()).toContain('3200')
    expect(wrapper.text()).toContain('2026-08-05')
  })

  it('缺 indices 不渲染指数区（容错，breadth 仍可渲染）', () => {
    const wrapper = mount(MarketSnapshotCard, {
      props: { card: { ...card, data: { up_count: 1, flat_count: 2, down_count: 3 } } },
    })
    expect(wrapper.find('.ms-main').exists()).toBe(false)
    expect(wrapper.find('.ms-list').exists()).toBe(false)
    expect(wrapper.text()).toContain('上涨')
  })

  it('全部字段缺失时不渲染卡片', () => {
    const wrapper = mount(MarketSnapshotCard, {
      props: { card: { ...card, data: {} } },
    })
    expect(wrapper.find('.ms-card').exists()).toBe(false)
  })
})
