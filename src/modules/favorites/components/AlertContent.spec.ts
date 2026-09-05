import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ---- Mock API ----
const stockApiMock = vi.hoisted(() => ({
  getTrendEvents: vi.fn(),
  getFavoritesNews: vi.fn(),
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
  {
    event_id: 'mv:600519:2026-08-19:2:down', trigger_revision: 1, symbol: '600519', stock_name: '贵州茅台',
    event_type: 'price', direction: 'down', triggered_at: '2026-08-19T08:00:00.000Z',
    latest_price: 180, previous_close: 185, change_pct: -2.7, threshold_pct: 5,
    severity: 'medium', rule_version: 'price-v1', analysis_status: 'completed',
    primary_cause: '板块调整',
  },
]

// 情报测试数据
const testIntelEvents = [
  {
    event_id: 'intel:1', symbol: '601318', stock_code: '601318', stock_name: '中国平安',
    event_time: '2026-08-19T06:00:00.000Z', title: '平安重大利好公告',
    ai_impact: '重大利好', cycle: 'short',
  },
  {
    event_id: 'intel:2', symbol: '000001', stock_code: '000001', stock_name: '平安银行',
    event_time: '2026-08-19T07:00:00.000Z', title: '平安银行普通利好',
    ai_impact: '利好', cycle: 'mid',
  },
]

// SvgIcon 桩
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

// Tag 桩
vi.mock('@/shared/components/Tag.vue', () => ({
  default: { name: 'Tag', props: ['type', 'size'], template: '<view class="tag-stub" />' },
}))

// LoadingState 桩
vi.mock('@/shared/components/LoadingState.vue', () => ({
  default: { name: 'LoadingState', props: ['text'], template: '<view class="loading-stub">{{ text }}</view>' },
}))

// Segmented 桩
vi.mock('@/shared/components/Segmented.vue', () => ({
  default: {
    name: 'Segmented',
    props: ['items', 'modelValue'],
    template: '<view class="segmented-stub"><slot /></view>',
    emits: ['change', 'update:modelValue'],
  },
}))

// ListCell 桩（保留 title/description 属性供断言）
vi.mock('@/shared/components/ListCell.vue', () => ({
  default: {
    name: 'ListCell',
    props: ['title', 'description', 'clickable'],
    template: '<view class="list-cell-stub" :data-title="title" :data-description="description"><slot name="prefix" /></view>',
  },
}))

// EmptyState 桩
vi.mock('@/shared/components/EmptyState.vue', () => ({
  default: { name: 'EmptyState', props: ['title'], template: '<view class="empty-stub">{{ title }}</view>' },
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
    stockApiMock.getFavoritesNews.mockReset()
    stockTraceApiMock.list.mockReset()
    vi.mocked(uni.navigateTo).mockClear()
    // 默认：个股情报为空，自选股洞察为空
    stockApiMock.getTrendEvents.mockResolvedValue({ events: [] })
    stockApiMock.getFavoritesNews.mockResolvedValue({ events: [] })
    stockTraceApiMock.list.mockResolvedValue({ items: [], nextCursor: null })
  })

  // ===== 自选股洞察 - 旧预览 ListCell 形态 =====

  it('接口成功 → 渲染 ≤6 行（mock 7 条可归因事件 → 只渲染 6 行）', async () => {
    // 构造 7 条可归因事件
    const sevenMovements = Array.from({ length: 7 }, (_, i) => ({
      event_id: `mv:test:${i}`, trigger_revision: 1, symbol: '600000', stock_name: `测试股${i}`,
      event_type: 'price' as const, direction: 'up' as const, triggered_at: '2026-08-19T10:00:00.000Z',
      latest_price: 10, previous_close: 9, change_pct: 10, threshold_pct: 7,
      severity: 'high' as const, rule_version: 'price-v1', analysis_status: 'completed' as const,
      primary_cause: `测试主因${i}`,
    }))
    stockTraceApiMock.list.mockResolvedValue({ items: sevenMovements, nextCursor: null })
    const wrapper = mount(AlertContent)
    await flushPromises()
    // 洞察块 ListCell 应为 6 行（第 7 条被截断）
    const cells = wrapper.findAll('.list-cell-stub')
    // 个股情报块为空（无情报数据），所以所有 list-cell-stub 都来自洞察块
    expect(cells.length).toBe(6)
    // 验证前 6 条有标题，第 7 条不出现
    expect(cells[0].attributes('data-title')).toBe('测试股0')
    expect(cells[5].attributes('data-title')).toBe('测试股5')
  })

  it('过滤：混合不可归因与可归因事件 → 仅可归因行渲染', async () => {
    // 2 条可归因 + 1 条 unavailable + 1 条 completed+primary_cause='证据不足'
    const attributableMovements = [
      { ...testMovements[0] }, // completed + primary_cause → 可归因
      { ...testMovements[1] }, // completed + primary_cause → 可归因
    ]
    const unattributableMovements = [
      {
        event_id: 'mv:unavail:1', trigger_revision: 1, symbol: '600000', stock_name: '黄河旋风',
        event_type: 'price' as const, direction: 'down' as const, triggered_at: '2026-09-03T04:00:00.000Z',
        latest_price: 10, previous_close: 11, change_pct: -9.1, threshold_pct: 7,
        severity: 'high' as const, rule_version: 'price-v1', analysis_status: 'unavailable' as const,
        primary_cause: null,
      },
      {
        event_id: 'mv:insuff:1', trigger_revision: 1, symbol: '300862', stock_name: '蓝盾光电',
        event_type: 'price' as const, direction: 'down' as const, triggered_at: '2026-09-03T05:00:00.000Z',
        latest_price: 20, previous_close: 22, change_pct: -9.1, threshold_pct: 7,
        severity: 'high' as const, rule_version: 'price-v1', analysis_status: 'completed' as const,
        primary_cause: '证据不足',
      },
    ]
    stockTraceApiMock.list.mockResolvedValue({
      items: [...attributableMovements, ...unattributableMovements],
      nextCursor: null,
    })
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cells = wrapper.findAll('.list-cell-stub')
    // 仅有 2 条可归因行渲染（其余 4 行为空占位保持 6 行）
    // 但空占位也渲染 ListCell（title='\u3000'），所以总共有 6 个 ListCell
    // 其中 2 个有真实 title，4 个为空占位
    expect(cells.length).toBe(6)
    // 检查有真实标题的行
    const realCells = cells.filter((c) => {
      const title = c.attributes('data-title')
      return title && title !== '\u3000'
    })
    expect(realCells.length).toBe(2)
    expect(realCells[0].attributes('data-title')).toBe('贵州茅台')
    expect(realCells[1].attributes('data-title')).toBe('中国平安')
  })

  it('行点击 → navigateTo 跳转 insight-detail-move?event_id=', async () => {
    stockTraceApiMock.list.mockResolvedValue({ items: [testMovements[0]], nextCursor: null })
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cells = wrapper.findAll('.list-cell-stub')
    // 第 1 行有真实数据
    await cells[0].trigger('click')
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: `/modules/favorites/pages/insight-detail-move?event_id=${encodeURIComponent(testMovements[0].event_id)}`,
    })
  })

  it('全部事件被过滤 → 显示空状态"暂无异动数据"', async () => {
    // 全部不可归因
    const allUnattributable = [
      {
        event_id: 'mv:unavail:1', trigger_revision: 1, symbol: '600000', stock_name: '黄河旋风',
        event_type: 'price' as const, direction: 'down' as const, triggered_at: '2026-09-03T04:00:00.000Z',
        latest_price: 10, previous_close: 11, change_pct: -9.1, threshold_pct: 7,
        severity: 'high' as const, rule_version: 'price-v1', analysis_status: 'unavailable' as const,
        primary_cause: null,
      },
    ]
    stockTraceApiMock.list.mockResolvedValue({ items: allUnattributable, nextCursor: null })
    const wrapper = mount(AlertContent)
    await flushPromises()
    // 洞察块空状态应显示"暂无异动数据"
    expect(wrapper.text()).toContain('暂无异动数据')
  })

  it('接口失败 → 显示空状态"暂无异动数据"', async () => {
    stockTraceApiMock.list.mockRejectedValue(new Error('network'))
    const wrapper = mount(AlertContent)
    await flushPromises()
    expect(wrapper.text()).toContain('暂无异动数据')
  })

  // ===== 个股情报模块（保留原有测试） =====

  it('个股情报模块：接口成功 → 渲染情报列表', async () => {
    const intelData = [
      { event_id: 'i1', stock_code: '601318', event_time: '2026-08-19T07:00:00Z', title: '利好消息', ai_impact: '利好', cycle: 'short' },
    ]
    stockApiMock.getTrendEvents.mockResolvedValue({ events: intelData })
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cells = wrapper.findAll('.list-cell-stub')
    // 洞察块 6 行（无数据，全是占位）+ 情报块 4 行（1 条真实 + 3 条占位）
    // 但洞察块空数据时显示 EmptyState，不渲染 ListCell
    // 所以只有情报块的 4 行
    // 洞察块没数据：captureList 为空 → EmptyState 显示 → 无 ListCell
    // 情报块：1 条真实 + 3 占位 = 4 个 ListCell
    expect(cells.length).toBe(4)
    // 第 1 行是真实数据
    expect(cells[0].attributes('data-title')).toBe('利好消息')
  })

  it('个股情报模块：接口失败 → 空状态', async () => {
    stockApiMock.getTrendEvents.mockRejectedValue(new Error('network'))
    const wrapper = mount(AlertContent)
    await flushPromises()
    const cells = wrapper.findAll('.list-cell-stub')
    // 洞察块空（无数据）+ 情报块空（接口失败）
    // 两个 EmptyState 展示，无 ListCell
    expect(cells.length).toBe(0)
  })
})