import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ===== mock 依赖 =====
// stockApi：首页搜索联想接口 + 其它卡片接口（组件 onMounted 会全部触发）
const stockApiMock = vi.hoisted(() => ({
  getStockList: vi.fn(async () => ({
    list: [{ symbol: '600519', name: '贵州茅台', market: 'SH', industry: '白酒' }],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  })),
  getHotBurstHistory: vi.fn(async () => []),
  getProfitForecastList: vi.fn(async () => ({})),
}))
vi.mock('@/shared/api/modules/stock', () => ({
  stockApi: stockApiMock,
}))

const trendScoreApiMock = vi.hoisted(() => ({
  getTop: vi.fn(async () => []),
}))
vi.mock('@/shared/api/modules/trend-score', () => ({
  trendScoreApi: trendScoreApiMock,
}))

// InsightListCard 桩（来自 shared barrel；避免真实渲染）
vi.mock('@/shared/components', () => ({
  InsightListCard: {
    name: 'InsightListCard',
    props: ['title', 'desc', 'iconName', 'items', 'status', 'statusText'],
    template: '<div class="insight-stub"><slot /></div>',
  },
  LoadingState: {
    name: 'LoadingState',
    props: ['text', 'size', 'layout'],
    template: '<div class="loading-stub" />',
  },
}))

// SvgIcon 桩：测试环境无真实 SVG 资源
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: {
    name: 'SvgIcon',
    props: ['name', 'size', 'color'],
    template: '<view class="svg-stub" />',
  },
}))

// happy-dom 无 uni 全局；onMounted 成功路径会调用 uni.setStorageSync
vi.stubGlobal('uni', {
  setStorageSync: vi.fn(),
  getStorageSync: vi.fn(() => ''),
  navigateTo: vi.fn(),
})

import StockContent from './StockContent.vue'

describe('StockContent 股票搜索框', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useRealTimers()
    stockApiMock.getStockList.mockClear()
    stockApiMock.getHotBurstHistory.mockClear()
    stockApiMock.getProfitForecastList.mockClear()
    vi.mocked(uni.navigateTo).mockClear()
  })

  it('渲染股票搜索框，输入关键词实时搜索并展示匹配股票', async () => {
    vi.useFakeTimers()
    const wrapper = mount(StockContent)
    await flushPromises()

    expect(wrapper.find('.stock-search').exists()).toBe(true)

    const input = wrapper.find('.stock-search__input')
    await input.trigger('input', { detail: { value: '茅台' } })
    // 推进 300ms 防抖后执行搜索
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(stockApiMock.getStockList).toHaveBeenCalledWith({ keyword: '茅台', page: 1, pageSize: 5 })
    const resultItem = wrapper.find('.search-result-item')
    expect(resultItem.exists()).toBe(true)
    expect(resultItem.text()).toContain('贵州茅台')
    vi.useRealTimers()
  })

  it('点击搜索结果跳转个股详情页', async () => {
    vi.useFakeTimers()
    const wrapper = mount(StockContent)
    await flushPromises()

    const input = wrapper.find('.stock-search__input')
    await input.trigger('input', { detail: { value: '茅台' } })
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    await wrapper.find('.search-result-item').trigger('tap')
    expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/modules/favorites/pages/detail?symbol=600519' })
    vi.useRealTimers()
  })

  it('不再渲染大盘概览（MarketOverview 已由搜索框替代）', async () => {
    const wrapper = mount(StockContent)
    await flushPromises()

    expect(wrapper.find('.as-market-overview').exists()).toBe(false)
  })
})
