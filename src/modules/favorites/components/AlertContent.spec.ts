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
    vi.mocked(uni.navigateTo).mockClear()
    // 个股情报 API 默认返回空（本测试只关注异动捕手模块）
    stockApiMock.getTrendEvents.mockResolvedValue({ events: [] })
  })

  it('接口成功 → 异动捕手模块渲染 ListCell 列表', async () => {
    insightApiMock.getInsights.mockResolvedValue(testInsights)
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cells = wrapper.findAllComponents({ name: 'ListCell' })
    // captureRows 固定 pad 到 CAPTURE_ROW_COUNT=4 行：2 条真实 + 2 条占位
    expect(cells.length).toBe(4)
    // 标题 = 股票名，描述 = 归因文案 · 日期（日期与描述同一行）
    expect(cells[0].props('title')).toBe('贵州茅台')
    expect(cells[0].props('description')).toBe('主因：白酒板块 · 08-07')
    expect(cells[1].props('title')).toBe('平安银行')
    expect(cells[1].props('description')).toBe('主因待验证 · 08-07')
    // 涨跌 Tag：涨→up(红)，跌→down(绿)
    const tags = wrapper.findAllComponents({ name: 'Tag' })
    expect(tags[0].props('type')).toBe('up')
    expect(tags[1].props('type')).toBe('down')
  })

  it('接口失败 → 展示空状态（不渲染列表行）', async () => {
    insightApiMock.getInsights.mockRejectedValue(new Error('network'))
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cells = wrapper.findAllComponents({ name: 'ListCell' })
    expect(cells.length).toBe(0)
  })

  it('点击列表行 → navigateTo 跳转 insight-detail', async () => {
    insightApiMock.getInsights.mockResolvedValue(testInsights)
    const wrapper = mount(AlertContent)
    await flushPromises()
    const firstCell = wrapper.findAllComponents({ name: 'ListCell' })[0]
    await firstCell.trigger('click')
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: '/modules/favorites/pages/insight-detail?event_id=c1',
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
