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
  // HotBurstInsightContent 等子组件从 barrel 取 EmptyState；桩模块若缺该导出会整棵渲染失败
  EmptyState: {
    name: 'EmptyState',
    props: ['title', 'description', 'icon', 'text'],
    template: '<div class="empty-stub" />',
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
  showToast: vi.fn(),
})

import StockContent from './StockContent.vue'

describe('StockContent 选股 Tab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useRealTimers()
    stockApiMock.getStockList.mockClear()
    stockApiMock.getHotBurstHistory.mockClear()
    stockApiMock.getProfitForecastList.mockClear()
    vi.mocked(uni.navigateTo).mockClear()
  })

  it('渲染 4 个 Tab（无「洞见」后缀），默认高亮「AI帮我选」', async () => {
    const wrapper = mount(StockContent)
    await flushPromises()

    const labels = wrapper.findAll('.stock-tabs__label').map(node => node.text())
    expect(labels).toEqual(['AI帮我选', '趋势股', '机构热门股', '业绩预测'])

    const active = wrapper.findAll('.stock-tabs__item.is-active')
    expect(active).toHaveLength(1)
    expect(active[0].text()).toBe('AI帮我选')
  })

  it('点击「机构热门股」Tab → 高亮切换且仅该 Tab 处于激活态', async () => {
    const wrapper = mount(StockContent)
    await flushPromises()

    await wrapper.findAll('.stock-tabs__item')[2].trigger('tap')

    const active = wrapper.findAll('.stock-tabs__item.is-active')
    expect(active).toHaveLength(1)
    expect(active[0].text()).toBe('机构热门股')
  })

  it('不再渲染大盘概览（MarketOverview 已由搜索框替代）', async () => {
    const wrapper = mount(StockContent)
    await flushPromises()

    expect(wrapper.find('.as-market-overview').exists()).toBe(false)
  })
})
