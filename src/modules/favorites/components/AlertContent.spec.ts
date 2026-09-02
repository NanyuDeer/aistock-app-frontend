import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const stockApiMock = vi.hoisted(() => ({
  getTrendEvents: vi.fn(),
}))
vi.mock('@/shared/api/modules/stock', () => ({ stockApi: stockApiMock }))

const stockTraceApiMock = vi.hoisted(() => ({
  list: vi.fn(),
}))
vi.mock('@/shared/api/modules/stockTrace', () => ({ stockTraceApi: stockTraceApiMock }))

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
    stockApiMock.getTrendEvents.mockReset()
    stockTraceApiMock.list.mockReset()
    vi.mocked(uni.navigateTo).mockClear()
    // 个股情报 API 默认返回空（本测试只关注自选股洞察模块）
    stockApiMock.getTrendEvents.mockResolvedValue({ events: [] })
    // 价格异动默认返回空
    stockTraceApiMock.list.mockResolvedValue({ items: [], nextCursor: null })
  })

  it('接口成功 → 自选股洞察渲染价格异动列表（按时间倒序）', async () => {
    stockTraceApiMock.list.mockResolvedValue({ items: testMovements, nextCursor: null })
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cells = wrapper.findAllComponents({ name: 'ListCell' })
    // captureRows 固定 pad 到 CAPTURE_ROW_COUNT=4 行：1 条真实 + 3 条占位
    expect(cells.length).toBe(4)
    expect(cells[0].props('title')).toBe('中国平安')
    expect(cells[0].props('description')).toBe('主因：大盘系统性下跌 · 08-19')
    // 涨跌 Tag：价格异动 涨→up(红)
    const tags = wrapper.findAllComponents({ name: 'Tag' })
    expect(tags[0].props('type')).toBe('up')
  })

  it('接口失败 → 展示空状态（不渲染列表行）', async () => {
    stockTraceApiMock.list.mockRejectedValue(new Error('network'))
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cells = wrapper.findAllComponents({ name: 'ListCell' })
    expect(cells.length).toBe(0)
  })

  it('点击价格异动行 → navigateTo 跳转 insight-detail-move', async () => {
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
    stockTraceApiMock.list.mockResolvedValue({ items: [testMovements[0]], nextCursor: null })
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cells = wrapper.findAllComponents({ name: 'ListCell' })
    // 固定 4 行，不足补占位（占位行 title 为全角空格 \u3000）
    expect(cells.length).toBe(4)
  })
})