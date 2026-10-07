import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// mock stocktrace API（页面唯一数据源）
const stockTraceApiMock = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock('@/shared/api/modules/stockTrace', () => ({ stockTraceApi: stockTraceApiMock }))

// SubPageCard2 桩：避免 GlobalChatBar / FloatingPodcast 等副作用；
// 额外暴露 stub-scroll-trigger（触发即 emit scrolltolower），供触底分页用例驱动
vi.mock('@/shared/components/SubPageCard2.vue', () => ({
  default: {
    name: 'SubPageCard2',
    props: ['title', 'subtitle'],
    emits: ['scrolltolower'],
    template: '<view class="subpage-stub"><slot /><view class="stub-scroll-trigger" @click="$emit(\'scrolltolower\')" /></view>',
  },
}))

// SvgIcon 桩（EmptyState 内部引用）
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))

vi.stubGlobal('uni', { navigateTo: vi.fn() })

// vitest 下 injectHook 不可用，onShow 同步触发；同时登记回调以便用例内再次触发（onShow 重置测试）
const onShowHandlers = vi.hoisted(() => [] as Array<() => void>)
vi.mock('@dcloudio/uni-app', () => ({
  onShow: (cb: () => void) => {
    onShowHandlers.push(cb)
    cb()
  },
}))

import insight from './insight.vue'

/** 构造一条 stocktrace 价格异动 */
function movement(over: Record<string, unknown> = {}) {
  return {
    event_id: 'mv:1',
    trigger_revision: 1,
    symbol: '600519',
    stock_name: '贵州茅台',
    event_type: 'price',
    direction: 'up',
    triggered_at: '2026-09-18T07:05:00.000Z',
    latest_price: 110,
    previous_close: 100,
    change_pct: 10,
    threshold_pct: 7,
    severity: 'high',
    rule_version: 'price-v1',
    analysis_status: 'completed',
    primary_cause: '白酒板块集体走强',
    ...over,
  }
}

describe('insight.vue 自选股洞察列表页（对齐个股情报模板）', () => {
  beforeEach(() => {
    stockTraceApiMock.list.mockReset()
    vi.mocked(uni.navigateTo).mockClear()
    stockTraceApiMock.list.mockResolvedValue({ items: [], nextCursor: null })
    onShowHandlers.length = 0
  })

  it('渲染顶部筛选栏：全部 / 上涨 / 下跌（对齐个股情报页的 filter-bar）', async () => {
    const wrapper = mount(insight)
    await flushPromises()
    const labels = wrapper.findAll('.as-segmented__label').map((n) => n.text())
    expect(labels).toEqual(['全部', '上涨', '下跌'])
  })

  it('列表行改用组件库 Card 三段式模板：event-top / event-title / event-bottom', async () => {
    stockTraceApiMock.list.mockResolvedValue({ items: [movement()], nextCursor: null })
    const wrapper = mount(insight)
    await flushPromises()
    const card = wrapper.find('.as-card')
    expect(card.exists()).toBe(true)
    expect(card.find('.event-top').exists()).toBe(true)
    expect(card.find('.event-title').exists()).toBe(true)
    expect(card.find('.event-bottom').exists()).toBe(true)
    // 上行：股票名 + 代码 chip + 涨跌幅（红涨绿跌着色）
    expect(card.find('.stock-name').text()).toBe('贵州茅台')
    expect(card.find('.stock-code').text()).toBe('600519')
    expect(card.find('.stock-move').text()).toBe('+10%')
  })

  it('中行展示主因正文（primary_cause 优先）', async () => {
    stockTraceApiMock.list.mockResolvedValue({ items: [movement()], nextCursor: null })
    const wrapper = mount(insight)
    await flushPromises()
    expect(wrapper.find('.event-title').text()).toBe('主因：白酒板块集体走强')
  })

  it('下行只在涨停事件上渲染「涨停」Badge，普通异动不渲染 Badge', async () => {
    stockTraceApiMock.list.mockResolvedValue({
      items: [
        movement({ event_id: 'mv:limit', symbol: '600519', stock_name: '贵州茅台', triggered_at: '2026-09-18T07:05:00.000Z', is_limit_up: true }),
        movement({ event_id: 'mv:plain', symbol: '000001', stock_name: '平安银行', triggered_at: '2026-09-18T06:05:00.000Z' }),
      ],
      nextCursor: null,
    })
    const wrapper = mount(insight)
    await flushPromises()
    const cards = wrapper.findAll('.as-card')
    expect(cards.length).toBe(2)
    expect(cards[0].find('.as-badge').text()).toBe('涨停')
    expect(cards[1].find('.as-badge').exists()).toBe(false)
  })

  it('切到「上涨」只保留上涨异动，切到「下跌」只保留下跌异动', async () => {
    stockTraceApiMock.list.mockResolvedValue({
      items: [
        movement({ event_id: 'mv:up', symbol: '600519', stock_name: '贵州茅台', direction: 'up', change_pct: 10, triggered_at: '2026-09-18T07:05:00.000Z' }),
        movement({ event_id: 'mv:down', symbol: '000001', stock_name: '平安银行', direction: 'down', change_pct: -8.2, triggered_at: '2026-09-18T06:05:00.000Z' }),
      ],
      nextCursor: null,
    })
    const wrapper = mount(insight)
    await flushPromises()
    expect(wrapper.findAll('.as-card').length).toBe(2)

    const tabs = wrapper.findAll('.as-segmented__item')
    await tabs[1].trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.as-card').length).toBe(1)
    expect(wrapper.find('.stock-name').text()).toBe('贵州茅台')

    await tabs[2].trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.as-card').length).toBe(1)
    expect(wrapper.find('.stock-name').text()).toBe('平安银行')
  })

  it('点击卡片 → navigateTo insight-detail-move?event_id=', async () => {
    stockTraceApiMock.list.mockResolvedValue({ items: [movement({ event_id: 'mv:x' })], nextCursor: null })
    const wrapper = mount(insight)
    await flushPromises()
    await wrapper.find('.as-card').trigger('tap')
    expect(uni.navigateTo).toHaveBeenCalledWith({
      url: `/modules/favorites/pages/insight-detail-move?event_id=${encodeURIComponent('mv:x')}`,
    })
  })

  it('无数据 → 渲染空态（不渲染卡片）', async () => {
    const wrapper = mount(insight)
    await flushPromises()
    expect(wrapper.findAll('.as-card').length).toBe(0)
    expect(wrapper.text()).toContain('暂无自选股洞察')
  })

  // ===== cursor 翻页 =====

  it('首屏 list 调用带 visible_only：true + cursor 未定义', async () => {
    stockTraceApiMock.list.mockResolvedValue({ items: [], nextCursor: null })
    const wrapper = mount(insight)
    await flushPromises()
    expect(stockTraceApiMock.list).toHaveBeenCalledWith(20, undefined, { visibleOnly: true })
  })

  it('分页主路径：首屏 1 页 → 触底追加第 2 页 → 跨页同 (股, 上海交易日) 只出一张卡（保留较新）', async () => {
    stockTraceApiMock.list
      .mockResolvedValueOnce({
        items: [movement({ event_id: 'mv:p1', change_pct: 8.5, triggered_at: '2026-09-18T01:00:00.000Z' })],
        nextCursor: '2026-09-18T01:00:00.000Z|mv:p1',
      })
      .mockResolvedValueOnce({
        items: [movement({ event_id: 'mv:p2', change_pct: 9.9, triggered_at: '2026-09-18T05:00:00.000Z' })],
        nextCursor: null,
      })
    const wrapper = mount(insight)
    await flushPromises()
    expect(wrapper.findAll('.as-card').length).toBe(1)
    expect(wrapper.find('.stock-move').text()).toBe('+8.5%')
    // 触底 → 追加载第 2 页，用第 1 页的 nextCursor
    await wrapper.find('.stub-scroll-trigger').trigger('click')
    await flushPromises()
    expect(stockTraceApiMock.list).toHaveBeenLastCalledWith(20, '2026-09-18T01:00:00.000Z|mv:p1', { visibleOnly: true })
    // 跨页同 (股, 日) 只出一张卡（对整体 rawItems 重派生，取较新的 mv:p2）
    expect(wrapper.findAll('.as-card').length).toBe(1)
    expect(wrapper.find('.stock-move').text()).toBe('+9.9%')
  })

  it('nextCursor === null → 触底不再请求（hasMore=false）', async () => {
    stockTraceApiMock.list.mockResolvedValue({ items: [movement()], nextCursor: null })
    const wrapper = mount(insight)
    await flushPromises()
    await wrapper.find('.stub-scroll-trigger').trigger('click')
    await flushPromises()
    expect(stockTraceApiMock.list).toHaveBeenCalledTimes(1)
  })

  it('加载失败不推进 cursor（再次触底用旧 cursor 重试）', async () => {
    stockTraceApiMock.list
      .mockResolvedValueOnce({ items: [movement({ event_id: 'mv:a' })], nextCursor: 'c1' })
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ items: [movement({ event_id: 'mv:b', symbol: '000001', stock_name: '平安银行' })], nextCursor: null })
    const wrapper = mount(insight)
    await flushPromises()
    expect(stockTraceApiMock.list).toHaveBeenCalledTimes(1)
    // 第一次触底：请求失败，不推进 cursor、不追加行
    await wrapper.find('.stub-scroll-trigger').trigger('click')
    await flushPromises()
    expect(stockTraceApiMock.list).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('.as-card').length).toBe(1)
    // 第二次触底：仍用旧 cursor 'c1' 重试 → 成功追加
    await wrapper.find('.stub-scroll-trigger').trigger('click')
    await flushPromises()
    expect(stockTraceApiMock.list).toHaveBeenLastCalledWith(20, 'c1', { visibleOnly: true })
    expect(wrapper.findAll('.as-card').length).toBe(2)
  })

  it('onShow 重置：累积后再次 onShow 重置为第 1 页（不叠加旧行）', async () => {
    stockTraceApiMock.list
      .mockResolvedValueOnce({ items: [movement({ event_id: 'mv:a' })], nextCursor: 'c2' })
      .mockResolvedValueOnce({ items: [movement({ event_id: 'mv:b', symbol: '000001', stock_name: '平安银行' })], nextCursor: null })
      .mockResolvedValueOnce({ items: [movement({ event_id: 'mv:a' })], nextCursor: 'c2' })
    const wrapper = mount(insight)
    await flushPromises()
    expect(wrapper.findAll('.as-card').length).toBe(1)
    // 触底累积到 2 条
    await wrapper.find('.stub-scroll-trigger').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.as-card').length).toBe(2)
    // 再次 onShow：整表重拉并重置 cursor/rawItems，仅剩第 1 页 mv:a，不叠加旧行
    onShowHandlers.at(-1)?.()
    await flushPromises()
    expect(stockTraceApiMock.list).toHaveBeenLastCalledWith(20, undefined, { visibleOnly: true })
    expect(wrapper.findAll('.as-card').length).toBe(1)
    expect(wrapper.find('.stock-name').text()).toBe('贵州茅台')
  })
})
