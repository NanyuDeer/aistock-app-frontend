import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// mock API
const insightApiMock = vi.hoisted(() => ({
  getInsights: vi.fn(),
}))
vi.mock('@/shared/api/modules/insight', () => ({
  watchlistInsightApi: insightApiMock,
}))

const stockApiMock = vi.hoisted(() => ({
  getTrendEvents: vi.fn(),
}))
vi.mock('@/shared/api/modules/stock', () => ({ stockApi: stockApiMock }))

const stockTraceApiMock = vi.hoisted(() => ({
  list: vi.fn(),
}))
vi.mock('@/shared/api/modules/stockTrace', () => ({ stockTraceApi: stockTraceApiMock }))

// 测试数据：本地内联，不依赖 mock-data.ts（已移除）
const testInsights = [
  {
    event_id: 'c1', symbol: '600519', stock_name: '贵州茅台',
    trade_date: '2026-08-07', event_type: 'limit_up_radar',
    direction: 'up', attribution_status: 'confirmed', confidence: 'high',
    primary_driver: { label: '白酒板块', category: 'industry_theme', confidence: 'high' },
    created_at: '2026-08-07T10:00:00+08:00',
  },
  {
    event_id: 'c2', symbol: '000001', stock_name: '平安银行',
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

// Tag 桩（ListCell prefix 内使用，避免依赖真实组件样式）
vi.mock('@/shared/components/Tag.vue', () => ({
  default: { name: 'Tag', props: ['type', 'size'], template: '<view class="tag-stub" />' },
}))

// uni 全局
vi.stubGlobal('uni', {
  navigateTo: vi.fn(),
})

import AlertContent from './AlertContent.vue'

describe('AlertContent.vue 首页特别提醒', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    insightApiMock.getInsights.mockReset()
    stockApiMock.getTrendEvents.mockReset()
    stockTraceApiMock.list.mockReset()
    vi.mocked(uni.navigateTo).mockClear()
    // 个股情报 API 默认返回空（本测试只关注自选股洞察模块）
    stockApiMock.getTrendEvents.mockResolvedValue({ events: [] })
    // 价格异动默认返回空
    stockTraceApiMock.list.mockResolvedValue({ items: [], nextCursor: null })
  })

  it('接口成功 → 自选股洞察渲染涨停雷达 + 价格异动融合列表（按时间倒序）', async () => {
    insightApiMock.getInsights.mockResolvedValue(testInsights)
    stockTraceApiMock.list.mockResolvedValue({ items: testMovements, nextCursor: null })
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cells = wrapper.findAllComponents({ name: 'ListCell' })
    // captureRows 固定 pad 到 CAPTURE_ROW_COUNT=4 行：3 条真实（2 涨停 + 1 价格异动）+ 1 条占位
    expect(cells.length).toBe(4)
    // 价格异动（08-19）比涨停雷达（08-07）更新，排在前面；主因来自 primary_cause
    expect(cells[0].props('title')).toBe('中国平安')
    expect(cells[0].props('description')).toBe('主因：大盘系统性下跌 · 08-19')
    expect(cells[1].props('title')).toBe('贵州茅台')
    expect(cells[1].props('description')).toBe('主因：白酒板块 · 08-07')
    expect(cells[2].props('title')).toBe('平安银行')
    expect(cells[2].props('description')).toBe('主因待验证 · 08-07')
    // 涨跌 Tag：价格异动 涨→up(红)，涨停雷达 涨→up，跌→down(绿)
    const tags = wrapper.findAllComponents({ name: 'Tag' })
    expect(tags[0].props('type')).toBe('up')
    expect(tags[1].props('type')).toBe('up')
    expect(tags[2].props('type')).toBe('down')
  })

  it('接口失败 → 展示空状态（不渲染列表行）', async () => {
    insightApiMock.getInsights.mockRejectedValue(new Error('network'))
    stockTraceApiMock.list.mockRejectedValue(new Error('network'))
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cells = wrapper.findAllComponents({ name: 'ListCell' })
    expect(cells.length).toBe(0)
  })

  it('点击涨停雷达行 → navigateTo 跳转 insight-detail', async () => {
    insightApiMock.getInsights.mockResolvedValue(testInsights)
    const wrapper = mount(AlertContent)
    await flushPromises()
    // 无价格异动时：cells[0] 为贵州茅台（涨停雷达）
    const firstCell = wrapper.findAllComponents({ name: 'ListCell' })[0]
    await firstCell.trigger('click')
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/modules/favorites/pages/insight-detail?event_id=c1',
    })
  })

  it('点击价格异动行 → navigateTo 跳转 insight-detail-move', async () => {
    insightApiMock.getInsights.mockResolvedValue(testInsights)
    stockTraceApiMock.list.mockResolvedValue({ items: testMovements, nextCursor: null })
    const wrapper = mount(AlertContent)
    await flushPromises()
    // 时间倒序：价格异动（08-19）排在最前
    const firstCell = wrapper.findAllComponents({ name: 'ListCell' })[0]
    await firstCell.trigger('click')
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: `/modules/favorites/pages/insight-detail-move?event_id=${encodeURIComponent(testMovements[0].event_id)}`,
    })
  })

  it('数据不足 4 行 → 用占位行填充（保持列表高度稳定）', async () => {
    insightApiMock.getInsights.mockResolvedValue([testInsights[0]])
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cells = wrapper.findAllComponents({ name: 'ListCell' })
    // 固定 4 行，不足补占位（占位行 title 为全角空格 \u3000）
    expect(cells.length).toBe(4)
  })
})
