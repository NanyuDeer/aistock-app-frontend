import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// mock API
const insightApiMock = vi.hoisted(() => ({
  getInsights: vi.fn(),
}))
vi.mock('@/shared/api/modules/insight', () => ({
  watchlistInsightApi: insightApiMock,
  // 类型导出占位（Vue SFC 内 import type 不实际调用）
}))

const stockTraceApiMock = vi.hoisted(() => ({
  list: vi.fn(),
}))
vi.mock('@/shared/api/modules/stockTrace', () => ({ stockTraceApi: stockTraceApiMock }))

// mock favorites store：stocks 置空、fetchFavorites no-op，
// 隔离 refreshQuotes / uni.showToast 等真实 store 副作用
vi.mock('@/shared/store/modules/favorites', () => ({
  useFavoritesStore: () => ({
    stocks: [],
    fetchFavorites: vi.fn(),
  }),
}))

// mock app store：alertEnabled=false 避免 onMounted 触发 subscribeAlerts / WS
vi.mock('@/shared/store/modules/app', () => ({
  useAppStore: () => ({
    config: { alertEnabled: false, firstLaunch: false, theme: 'light' as const },
    update: vi.fn(),
  }),
}))

// 测试数据：本地内联，不依赖 mock-data.ts（已移除）
const testInsights = [
  {
    event_id: 'm1', symbol: '600519', stock_name: '贵州茅台',
    trade_date: '2026-08-07', event_type: 'limit_up_radar',
    direction: 'up', attribution_status: 'confirmed', confidence: 'high',
    primary_driver: { label: '白酒板块', category: 'industry_theme', confidence: 'high' },
    created_at: '2026-08-07T10:00:00+08:00',
  },
  {
    event_id: 'm2', symbol: '000001', stock_name: '平安银行',
    trade_date: '2026-08-07', event_type: 'limit_up_radar',
    direction: 'down', attribution_status: 'unconfirmed', confidence: 'unconfirmed',
    created_at: '2026-08-07T11:00:00+08:00',
  },
]

// 价格异动（stocktrace 链路）测试数据
const testMovements = [
  {
    event_id: 'mv:601318:2026-08-19:1:up', trigger_revision: 1, symbol: '601318', stock_name: '中国平安',
    event_type: 'price', direction: 'up', triggered_at: '2026-08-19T07:26:22.789Z',
    latest_price: 100, previous_close: 100, change_pct: 8.5, threshold_pct: 7,
    severity: 'high', rule_version: 'price-v1', analysis_status: 'completed',
    primary_cause: '大盘系统性下跌',
    movement_view: { primaryCandidate: { layer: 'market', verdict: '大盘系统性下跌是主要背景' } },
  },
]

// SvgIcon 桩
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

// SubPageCard2 桩（避免渲染 GlobalChatBar/FloatingPodcast 等副作用）
vi.mock('@/shared/components/SubPageCard2.vue', () => ({
  default: { name: 'SubPageCard2', props: ['title', 'subtitle'], template: '<view class="subpage-stub"><slot /></view>' },
}))

// uni 全局
vi.stubGlobal('uni', {
  navigateTo: vi.fn(),
  connectSocket: vi.fn(),
  getStorageSync: vi.fn(() => 'fake-token'),
  showToast: vi.fn(),
})

// mock @dcloudio/uni-app onShow 生命周期（vitest 下 injectHook 不可用）。
// 同步触发 cb：fetchAlerts 是 async，会在首个 await 挂起，其 microtask 续延
// 早于 flushPromises 的 setImmediate(resolve) 触发，确保数据加载完成可被断言。
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (cb: () => void) => {
    cb()
  },
}))

import monitor from './monitor.vue'

describe('monitor.vue 自选股异动页', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    insightApiMock.getInsights.mockReset()
    stockTraceApiMock.list.mockReset()
    vi.mocked(uni.navigateTo).mockClear()
    // 价格异动默认返回空
    stockTraceApiMock.list.mockResolvedValue({ items: [], nextCursor: null })
  })

  it('接口成功 → 渲染涨停雷达 + 价格异动融合列表', async () => {
    insightApiMock.getInsights.mockResolvedValue(testInsights)
    stockTraceApiMock.list.mockResolvedValue({ items: testMovements, nextCursor: null })
    const wrapper = mount(monitor)
    await flushPromises()
    // 2 条涨停雷达 + 1 条价格异动
    const cards = wrapper.findAllComponents({ name: 'InsightAlertCard' })
    expect(cards.length).toBe(3)
    // 时间倒序：价格异动（08-19）排最前，message 显示 LLM 主因短语
    expect(cards[0].props('name')).toBe('中国平安')
    expect(cards[0].props('message')).toBe('主因：大盘系统性下跌')
  })

  it('接口失败 → 展示空状态（不渲染卡片）', async () => {
    insightApiMock.getInsights.mockRejectedValue(new Error('network'))
    stockTraceApiMock.list.mockRejectedValue(new Error('network'))
    const wrapper = mount(monitor)
    await flushPromises()
    const cards = wrapper.findAllComponents({ name: 'InsightAlertCard' })
    expect(cards.length).toBe(0)
  })

  it('点击涨停雷达卡片 → navigateTo 跳转 insight-detail', async () => {
    insightApiMock.getInsights.mockResolvedValue(testInsights)
    const wrapper = mount(monitor)
    await flushPromises()
    const firstCard = wrapper.findAllComponents({ name: 'InsightAlertCard' })[0]
    await firstCard.vm.$emit('click', new Event('click'))
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/modules/favorites/pages/insight-detail?event_id=m1',
    })
  })

  it('点击价格异动卡片 → navigateTo 跳转 insight-detail-move', async () => {
    insightApiMock.getInsights.mockResolvedValue(testInsights)
    stockTraceApiMock.list.mockResolvedValue({ items: testMovements, nextCursor: null })
    const wrapper = mount(monitor)
    await flushPromises()
    // 时间倒序：价格异动（08-19）排最前
    const firstCard = wrapper.findAllComponents({ name: 'InsightAlertCard' })[0]
    await firstCard.vm.$emit('click', new Event('click'))
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: `/modules/favorites/pages/insight-detail-move?event_id=${encodeURIComponent(testMovements[0].event_id)}`,
    })
  })
})
