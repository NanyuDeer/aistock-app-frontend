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

// SvgIcon 桩
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

// InsightAlertCard 桩（避免渲染真实组件，专注验证传入 props）
vi.mock('@/shared/components/InsightAlertCard.vue', () => ({
  default: {
    name: 'InsightAlertCard',
    props: ['name', 'symbol', 'direction', 'message', 'type', 'time', 'confidence', 'compact', 'clickable'],
    template: '<view class="insight-alert-card-stub" :data-compact="compact" :data-name="name" :data-direction="direction" />',
  },
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
    vi.mocked(uni.navigateTo).mockClear()
    // 个股情报 API 默认返回空（本测试只关注异动捕手模块）
    stockApiMock.getTrendEvents.mockResolvedValue({ events: [] })
  })

  it('接口成功 → 异动捕手模块渲染 InsightAlertCard compact 列表', async () => {
    insightApiMock.getInsights.mockResolvedValue(testInsights)
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cards = wrapper.findAllComponents({ name: 'InsightAlertCard' })
    // captureRows 固定 pad 到 CAPTURE_ROW_COUNT=4 行：2 条真实 + 2 条占位
    expect(cards.length).toBe(4)
    // 验证传入 compact=true
    expect(cards[0].props('compact')).toBe(true)
    expect(cards[1].props('compact')).toBe(true)
  })

  it('接口失败 → 展示空状态（不渲染卡片）', async () => {
    insightApiMock.getInsights.mockRejectedValue(new Error('network'))
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cards = wrapper.findAllComponents({ name: 'InsightAlertCard' })
    expect(cards.length).toBe(0)
  })

  it('点击 InsightAlertCard → navigateTo 跳转 insight-detail', async () => {
    insightApiMock.getInsights.mockResolvedValue(testInsights)
    const wrapper = mount(AlertContent)
    await flushPromises()
    const firstCard = wrapper.findAllComponents({ name: 'InsightAlertCard' })[0]
    await firstCard.vm.$emit('click', new Event('click'))
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/modules/favorites/pages/insight-detail?event_id=c1',
    })
  })

  it('数据不足 4 行 → 用占位卡填充（保持卡片高度稳定）', async () => {
    insightApiMock.getInsights.mockResolvedValue([testInsights[0]])
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cards = wrapper.findAllComponents({ name: 'InsightAlertCard' })
    // 固定 4 行，不足补占位（占位卡也用 InsightAlertCard，name 为空）
    expect(cards.length).toBe(4)
  })
})
