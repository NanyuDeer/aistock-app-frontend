import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ===== mock 依赖 =====
// stockApi：大盘指数接口 + 首页其它卡片接口（组件 onMounted 会全部触发）
const stockApiMock = vi.hoisted(() => ({
  getCnIndexQuotes: vi.fn(async () => [
    { index: '000001', name: '上证指数', price: 3832.26, changePercent: 0.72, changeAmount: 27 },
    { index: '399001', name: '深证成指', price: 12000, changePercent: -0.5, changeAmount: -60 },
    { index: '399006', name: '创业板指', price: 2600, changePercent: 1.1, changeAmount: 28 },
  ]),
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

vi.mock('@/shared/utils/tradingTime', () => ({
  getMarketStatus: () => '交易中',
}))

// InsightListCard 桩（来自 shared barrel；仅验证大盘概览接线，无需真实渲染）
vi.mock('@/shared/components', () => ({
  InsightListCard: {
    name: 'InsightListCard',
    props: ['title', 'desc', 'iconName', 'items', 'status', 'statusText'],
    template: '<div class="insight-stub"><slot /></div>',
  },
}))

// MarketOverview 桩：记录接收到的 indices/status props，验证 StockContent 接线
vi.mock('@/modules/market/components/MarketOverview.vue', () => ({
  default: {
    name: 'MarketOverview',
    props: {
      indices: { type: Array, default: () => [] },
      status: { type: String, default: '' },
    },
    template: '<div class="mo-stub" />',
  },
}))

// happy-dom 无 uni 全局；onMounted 成功路径会调用 uni.setStorageSync
vi.stubGlobal('uni', {
  setStorageSync: vi.fn(),
  getStorageSync: vi.fn(() => ''),
  navigateTo: vi.fn(),
})

import StockContent from './StockContent.vue'

describe('StockContent 大盘概览接线', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    stockApiMock.getCnIndexQuotes.mockClear()
  })

  it('onMounted 拉取指数后，MarketOverview 收到 store 的 indices/status', async () => {
    const wrapper = mount(StockContent)
    await flushPromises()

    // onMounted 触发 fetchIndices → getCnIndexQuotes（纯数字代码）
    expect(stockApiMock.getCnIndexQuotes).toHaveBeenCalledWith(['000001', '399001', '399006'])

    const overview = wrapper.findComponent({ name: 'MarketOverview' })
    expect(overview.exists()).toBe(true)
    expect(overview.props('status')).toBe('交易中')
    const indices = overview.props('indices') as Array<{ code: string; name: string }>
    expect(indices).toHaveLength(3)
    expect(indices[0]).toMatchObject({ code: '000001', name: '上证指数' })
    expect(indices[1]).toMatchObject({ code: '399001', name: '深证成指' })
  })
})
