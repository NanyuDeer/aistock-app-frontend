import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StockSnapshotCard from './StockSnapshotCard.vue'
import type { ChatCard } from '@/shared/api/modules/agent'

describe('StockSnapshotCard', () => {
  const card: ChatCard = {
    card_type: 'stock_snapshot',
    title: '贵州茅台',
    data: { name: '贵州茅台', code: '600519', price: 1688.5, change: 12.3, change_pct: 0.73 },
  }

  it('渲染名称/代码/价格/涨跌幅', () => {
    const wrapper = mount(StockSnapshotCard, { props: { card } })
    expect(wrapper.text()).toContain('贵州茅台')
    expect(wrapper.text()).toContain('600519')
    expect(wrapper.text()).toContain('1688.50')
    expect(wrapper.text()).toContain('+0.73%')
  })

  it('缺 pe/pb/market_cap 时指标三栏隐藏（core 5 字段兼容）', () => {
    const wrapper = mount(StockSnapshotCard, { props: { card } })
    expect(wrapper.find('.ss-metrics').exists()).toBe(false)
  })

  it('有 pe/pb/market_cap 时渲染三栏', () => {
    const full: ChatCard = {
      ...card,
      data: { ...card.data, pe: 28.5, pb: 9.1, market_cap: 2.1e12 },
    }
    const wrapper = mount(StockSnapshotCard, { props: { card: full } })
    expect(wrapper.text()).toContain('市盈率')
    expect(wrapper.text()).toContain('市净率')
    expect(wrapper.text()).toContain('2.10万亿')
  })

  it('data 全缺时不渲染', () => {
    const wrapper = mount(StockSnapshotCard, { props: { card: { ...card, data: {} } } })
    expect(wrapper.find('.ss-card').exists()).toBe(false)
  })
})
