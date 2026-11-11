import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'

// 自选 store 桩：只保留切换行为所需的 4 个方法（isFavorite / isPending / add / remove）
const favoritesMock = vi.hoisted(() => {
  const favorites = new Set<string>()
  const pending = new Set<string>()
  return {
    favorites,
    pending,
    isFavorite: vi.fn((symbol: string) => favorites.has(symbol)),
    isPending: vi.fn((symbol: string) => pending.has(symbol)),
    add: vi.fn(async (symbol: string) => { favorites.add(symbol); return true }),
    remove: vi.fn(async (symbol: string) => { favorites.delete(symbol); return true }),
  }
})

const selectionMock = vi.hoisted(() => ({
  getLatest: vi.fn(),
  getResults: vi.fn(),
  getQuotes: vi.fn(),
  getCachedQuotes: vi.fn(),
}))

vi.mock('@/shared/store', () => ({
  useFavoritesStore: () => favoritesMock,
}))

vi.mock('@/shared/api/modules/ai-stock-selection', () => ({
  aiStockSelectionApi: selectionMock,
}))

vi.stubGlobal('uni', {
  showToast: vi.fn(),
  navigateTo: vi.fn(),
  getStorageSync: vi.fn(() => ''),
  setStorageSync: vi.fn(),
})

import AiPickContent from './AiPickContent.vue'

enableAutoUnmount(afterEach)
beforeEach(() => { selectionMock.getQuotes.mockReset(); selectionMock.getQuotes.mockResolvedValue([]); selectionMock.getCachedQuotes.mockReset(); selectionMock.getCachedQuotes.mockReturnValue({}) })
afterEach(() => { vi.useRealTimers() })

describe('AiPickContent 自选按钮（加/取消 双向切换）', () => {
  beforeEach(() => {
    favoritesMock.favorites.clear()
    favoritesMock.pending.clear()
    favoritesMock.isFavorite.mockClear()
    favoritesMock.isPending.mockClear()
    favoritesMock.add.mockClear()
    favoritesMock.remove.mockClear()
    vi.mocked(uni.showToast).mockClear()
    selectionMock.getLatest.mockResolvedValue({
      status: 'ready',
      stocks: [{ symbol: '600577', name: '精达股份', price: 9.58, changePct: 5.04, reason: ['多因子共振'], rank: 1, recommendationLevel: '较高', riskTip: '' }],
    })
  })

  it('未自选 → 点击加自选：调用 add 并提示「已加入自选」', async () => {
    const wrapper = mount(AiPickContent)
    await vi.dynamicImportSettled()
    const btn = wrapper.findAll('.favorite-button')[0]
    expect(btn.classes()).not.toContain('added')

    await btn.trigger('tap')

    expect(favoritesMock.add).toHaveBeenCalledWith('600577', '精达股份')
    expect(favoritesMock.remove).not.toHaveBeenCalled()
    expect(uni.showToast).toHaveBeenCalledWith({ title: '已加入自选', icon: 'success' })
  })

  it('已自选 → 再次点击取消自选：调用 remove 并提示「已移除自选」', async () => {
    favoritesMock.favorites.add('600577')
    const wrapper = mount(AiPickContent)
    await vi.dynamicImportSettled()
    const btn = wrapper.findAll('.favorite-button')[0]
    expect(btn.classes()).toContain('added')

    await btn.trigger('tap')

    expect(favoritesMock.remove).toHaveBeenCalledWith('600577')
    expect(favoritesMock.add).not.toHaveBeenCalled()
    expect(uni.showToast).toHaveBeenCalledWith({ title: '已移除自选', icon: 'none' })
  })

  it('请求进行中（pending）→ 点击不重复触发', async () => {
    favoritesMock.pending.add('600577')
    const wrapper = mount(AiPickContent)
    await vi.dynamicImportSettled()
    await wrapper.findAll('.favorite-button')[0].trigger('tap')

    expect(favoritesMock.add).not.toHaveBeenCalled()
    expect(favoritesMock.remove).not.toHaveBeenCalled()
  })
})

describe('AiPickContent 盘后方法单选与多选', () => {
  const row = (symbol: string, rank: number, changePct: number) => ({ symbol, name: `方法股${symbol}`, price: 20, changePct, reason: ['真实方法依据'], rank, recommendationLevel: '关注', riskTip: '跌破支撑重新评估', matchedTags: ['放量突破'] })
  beforeEach(() => {
    vi.mocked(uni.getStorageSync).mockReturnValue('')
    vi.mocked(uni.setStorageSync).mockClear()
    selectionMock.getLatest.mockClear()
    selectionMock.getResults.mockReset()
    selectionMock.getLatest.mockResolvedValue({ status: 'ready', stocks: [{ symbol: '600999', name: 'AI综合股', reason: ['AI理由'], rank: 1, recommendationLevel: '关注', riskTip: '' }] })
    selectionMock.getResults.mockResolvedValue({ status: 'ready', tradeDate: '2026-11-04', stocks: [row('600001', 1, 1), row('600002', 2, 9)] })
  })

  it('单选使用统一方法接口并保留后端排名，不复用AI名单', async () => {
    const wrapper = mount(AiPickContent)
    await flushPromises()
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '短线机会')!.trigger('tap')
    await flushPromises()
    expect(selectionMock.getResults).toHaveBeenLastCalledWith('short', ['volume_breakout'])
    expect(wrapper.findAll('.stock-name').map(n => n.text())).toEqual(['方法股600001', '方法股600002'])
    expect(wrapper.find('.reason-label').text()).toBe('洞见')
    expect(wrapper.text()).not.toContain('数据日期')
    expect(wrapper.text()).not.toContain('盘后确认 · 符合任一所选方法即可入选，综合表现优先')
    expect(wrapper.text()).toContain('放量突破')
    expect(wrapper.text()).not.toContain('跌破支撑重新评估')
    expect(wrapper.find('.risk-note').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('AI综合股')
  })

  it('洞见只在实际高度超过两行时显示展开按钮', async () => {
    const query = {
      in: () => query,
      selectAll: () => query,
      boundingClientRect: () => query,
      exec: (callback: (bounds: Array<Array<{ height: number }>>) => void) =>
        callback([[{ height: 30 }, { height: 45 }], [{ height: 30 }, { height: 30 }]]),
    }
    Object.assign(uni, { createSelectorQuery: () => query })
    try {
      const wrapper = mount(AiPickContent)
      await wrapper.findAll('.horizon-chip').find(node => node.text() === '短线机会')!.trigger('tap')
      await flushPromises()
      const cards = wrapper.findAll('.ai-pick-row')
      expect(cards[0].find('.reason-toggle').exists()).toBe(false)
      expect(cards[1].find('.reason-toggle').exists()).toBe(true)
      await cards[1].find('.reason-line').trigger('tap')
      expect(cards[1].find('.reason-text').classes()).toContain('expanded')
    } finally {
      Reflect.deleteProperty(uni, 'createSelectorQuery')
    }
  })

  it('同周期多选一次请求传全部方法，切换周期后只传当前周期方法', async () => {
    const wrapper = mount(AiPickContent)
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '短线机会')!.trigger('tap')
    await wrapper.findAll('.method-chip').find(n => n.text() === '强势延续')!.trigger('tap')
    await flushPromises()
    expect(selectionMock.getResults).toHaveBeenLastCalledWith('short', ['volume_breakout', 'momentum_continuation'])
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '波段趋势')!.trigger('tap')
    await wrapper.findAll('.method-chip').find(n => n.text() === '回踩企稳')!.trigger('tap')
    await flushPromises()
    expect(selectionMock.getResults).toHaveBeenLastCalledWith('swing', ['trend_following', 'pullback_stabilization'])
  })

  it('最后一个方法允许取消，不请求接口并清除旧结果', async () => {
    const wrapper = mount(AiPickContent)
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '短线机会')!.trigger('tap')
    await flushPromises()
    const calls = selectionMock.getResults.mock.calls.length
    await wrapper.find('.method-chip.active').trigger('tap')
    await flushPromises()
    expect(selectionMock.getResults).toHaveBeenCalledTimes(calls)
    expect(wrapper.find('.stock-name').exists()).toBe(false)
    expect(wrapper.find('.ai-pick-state').text()).toBe('请选择选股方法')
    expect(uni.setStorageSync).toHaveBeenLastCalledWith('ai_stock_selection_strategy_preference', { v: 3, horizon: 'short', methods: [] })
  })

  it('新增三种方法按各自大类发送到统一接口', async () => {
    const wrapper = mount(AiPickContent)
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '短线机会')!.trigger('tap')
    await flushPromises()
    await wrapper.findAll('.method-chip').find(n => n.text() === '事件催化')!.trigger('tap')
    expect(selectionMock.getResults).toHaveBeenLastCalledWith('short', ['volume_breakout', 'event_catalyst'])
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '波段趋势')!.trigger('tap')
    await wrapper.findAll('.method-chip').find(n => n.text() === '盈利预期上修')!.trigger('tap')
    expect(selectionMock.getResults).toHaveBeenLastCalledWith('swing', ['trend_following', 'earnings_revision'])
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '中长线配置')!.trigger('tap')
    expect(selectionMock.getResults).toHaveBeenLastCalledWith('long', ['quality_growth'])
    await wrapper.findAll('.method-chip').find(n => n.text() === '合理估值成长')!.trigger('tap')
    expect(selectionMock.getResults).toHaveBeenLastCalledWith('long', ['quality_growth', 'garp'])
    await wrapper.findAll('.method-chip').find(n => n.text() === '红利稳健')!.trigger('tap')
    expect(selectionMock.getResults).toHaveBeenLastCalledWith('long', ['quality_growth', 'garp', 'stable_dividend'])
  })

  it('恢复多选偏好、迁移旧方法，保留全部取消状态', async () => {
    vi.mocked(uni.getStorageSync).mockReturnValue({ v: 2, horizon: 'short', methods: ['volume_price', 'short_trend'] } as never)
    const wrapper = mount(AiPickContent)
    await flushPromises()
    expect(selectionMock.getResults).toHaveBeenLastCalledWith('short', ['volume_breakout', 'momentum_continuation'])
    wrapper.unmount()
    vi.mocked(uni.getStorageSync).mockReturnValue({ v: 3, horizon: 'short', methods: [] } as never)
    const empty = mount(AiPickContent)
    await flushPromises()
    expect(empty.find('.ai-pick-state').text()).toBe('请选择选股方法')
  })

  it.each([
    ['stale', '尚未更新'], ['failed', '暂不可用'], ['unavailable', '数据覆盖不足'], ['generating', '正在生成'], ['ready', '暂无所选方法'],
  ])('%s状态不显示旧股票', async (status, text) => {
    selectionMock.getResults.mockResolvedValue({ status, stocks: [] })
    const wrapper = mount(AiPickContent)
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '短线机会')!.trigger('tap')
    await flushPromises()
    expect(wrapper.find('.stock-name').exists()).toBe(false)
    expect(wrapper.find('.ai-pick-state').text()).toContain(text)
  })

  it('快速切换时过期请求的成功和失败都不能覆盖当前方法结果', async () => {
    let resolveOld!: (value: unknown) => void
    selectionMock.getResults.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve }))
    const wrapper = mount(AiPickContent)
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '短线机会')!.trigger('tap')
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '波段趋势')!.trigger('tap')
    await flushPromises()
    resolveOld({ status: 'ready', stocks: [row('600888', 1, 10)] })
    await flushPromises()
    expect(wrapper.findAll('.stock-name').map(n => n.text())).toEqual(['方法股600001', '方法股600002'])
    let rejectOld!: (error: Error) => void
    selectionMock.getResults.mockReturnValueOnce(new Promise((_, reject) => { rejectOld = reject }))
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '短线机会')!.trigger('tap')
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '波段趋势')!.trigger('tap')
    await flushPromises()
    rejectOld(new Error('obsolete request failed'))
    await flushPromises()
    expect(wrapper.find('.stock-name').exists()).toBe(true)
    expect(wrapper.find('.ai-pick-state').exists()).toBe(false)
  })
})

describe('AiPickContent 列表排序（保留服务端推荐顺序）', () => {
  beforeEach(() => {
    vi.mocked(uni.getStorageSync).mockReturnValue('')
    favoritesMock.favorites.clear()
    favoritesMock.pending.clear()
    vi.mocked(uni.showToast).mockClear()
  })

  it('AI综合保留服务端推荐顺序，不因实时涨幅更高而重排', async () => {
    selectionMock.getLatest.mockResolvedValue({
      status: 'ready',
      stocks: [
        { symbol: '600001', name: '小涨股', price: 10, changePct: 1.2, reason: ['a'], rank: 1, recommendationLevel: '较高', riskTip: '' },
        { symbol: '600002', name: '大涨股', price: 20, changePct: 9.8, reason: ['b'], rank: 2, recommendationLevel: '较高', riskTip: '' },
        { symbol: '600003', name: '下跌股', price: 30, changePct: -3.5, reason: ['c'], rank: 3, recommendationLevel: '较高', riskTip: '' },
      ],
    })
    selectionMock.getQuotes.mockImplementation(async () => (await selectionMock.getLatest()).stocks.map((s: { symbol: string; price: number | null; changePct: number | null }) => ({ symbol: s.symbol, price: s.price, changePct: s.changePct, changeAmount: null })))
    const wrapper = mount(AiPickContent)
    await flushPromises()
    const names = wrapper.findAll('.stock-name').map((el) => el.text())
    expect(names).toEqual(['小涨股', '大涨股', '下跌股'])
  })

  it('实时涨幅缺失不影响服务端推荐顺序', async () => {
    selectionMock.getLatest.mockResolvedValue({
      status: 'ready',
      stocks: [
        { symbol: '600011', name: '停牌股', price: null, changePct: null, reason: ['a'], rank: 1, recommendationLevel: '较高', riskTip: '' },
        { symbol: '600012', name: '小涨股', price: 10, changePct: 0.5, reason: ['b'], rank: 2, recommendationLevel: '较高', riskTip: '' },
        { symbol: '600013', name: '大涨股', price: 20, changePct: 6.6, reason: ['c'], rank: 3, recommendationLevel: '较高', riskTip: '' },
      ],
    })
    selectionMock.getQuotes.mockImplementation(async () => (await selectionMock.getLatest()).stocks.map((s: { symbol: string; price: number | null; changePct: number | null }) => ({ symbol: s.symbol, price: s.price, changePct: s.changePct, changeAmount: null })))
    const wrapper = mount(AiPickContent)
    await flushPromises()
    const names = wrapper.findAll('.stock-name').map((el) => el.text())
    expect(names).toEqual(['停牌股', '小涨股', '大涨股'])
  })
})


describe('AiPickContent 实时行情', () => {
  beforeEach(() => {
    vi.mocked(uni.getStorageSync).mockReturnValue({ v: 3, horizon: 'swing', methods: ['trend_following'] } as never)
    selectionMock.getResults.mockResolvedValue({ status: 'ready', tradeDate: '2026-11-05', stocks: [
      { symbol: '600001', name: '第一名', price: 10, changePct: 8, sparkline: [8, 9, 10], reason: ['收盘准入'], rank: 1, riskTip: '盘后确认观察名单，不代表可按收盘价成交。' },
      { symbol: '600002', name: '第二名', price: 20, changePct: 2, reason: ['收盘准入'], rank: 2, riskTip: '' },
    ] })
  })
  it('以最新行情覆盖收盘快照，展示涨跌额和涨跌幅，保留方法排名', async () => {
    selectionMock.getQuotes.mockResolvedValue([
      { symbol: '600001', price: 61.02, changeAmount: .49, changePct: .81 },
      { symbol: '600002', price: 21.5, changeAmount: 1.5, changePct: 7.5 },
    ])
    const wrapper = mount(AiPickContent)
    await flushPromises()
    expect(selectionMock.getQuotes).toHaveBeenCalledWith(['600001', '600002'])
    expect(wrapper.findAll('.stock-price').map(n => n.text())).toEqual(['61.02', '21.50'])
    expect(wrapper.findAll('.stock-change').map(n => n.text())).toEqual(['+0.49（+0.81%）', '+1.50（+7.50%）'])
    expect(wrapper.findAll('.stock-name').map(n => n.text())).toEqual(['第一名', '第二名'])
    expect(wrapper.text()).not.toContain('数据日期')
    expect(wrapper.text()).not.toContain('盘后确认观察名单')
  })
  it('行情首次失败显示重试入口，不把选股收盘价当作最新行情', async () => {
    selectionMock.getQuotes.mockRejectedValue(new Error('quote unavailable'))
    const wrapper = mount(AiPickContent)
    await flushPromises()
    expect(wrapper.findAll('.stock-price')).toHaveLength(0)
    expect(wrapper.findAll('.quote-unavailable')).toHaveLength(2)
    expect(wrapper.find('.market-skeleton').exists()).toBe(false)
    expect(wrapper.findAll('.stock-name')).toHaveLength(2)
  })
  it('首次行情等待时用骨架占位，响应后直接显示数字', async () => {
    let resolveQuotes!: (value: unknown) => void
    selectionMock.getQuotes.mockReturnValue(new Promise(resolve => { resolveQuotes = resolve }))
    const wrapper = mount(AiPickContent)
    await flushPromises()
    expect(wrapper.findAll('.market-skeleton')).toHaveLength(2)
    expect(wrapper.find('.stock-price').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('--（--）')
    resolveQuotes([{ symbol: '600001', price: 12, changeAmount: 2, changePct: 20 }])
    await flushPromises()
    expect(wrapper.find('.market-skeleton').exists()).toBe(false)
    expect(wrapper.find('.stock-price').text()).toBe('12.00')
    expect(wrapper.findAll('.quote-unavailable')).toHaveLength(1)
  })
  it('有最近行情缓存时直接展示并后台更新，不再次出现骨架', async () => {
    selectionMock.getCachedQuotes.mockReturnValue({ '600001': { symbol: '600001', price: 11, changeAmount: 1, changePct: 10 } })
    let resolveQuotes!: (value: unknown) => void
    selectionMock.getQuotes.mockReturnValue(new Promise(resolve => { resolveQuotes = resolve }))
    const wrapper = mount(AiPickContent)
    await flushPromises()
    expect(wrapper.find('.stock-price').text()).toBe('11.00')
    expect(wrapper.findAll('.market-skeleton')).toHaveLength(1)
    resolveQuotes([{ symbol: '600001', price: 12, changeAmount: 2, changePct: 20 }])
    await flushPromises()
    expect(wrapper.find('.stock-price').text()).toBe('12.00')
  })
  it('走势图使用真实历史收盘序列，并按行情交易日补最新价格点', async () => {
    selectionMock.getQuotes.mockResolvedValue([{ symbol: '600001', price: 9, changeAmount: -1, changePct: -10, tradeDate: '2026-11-06' }])
    const wrapper = mount(AiPickContent)
    await flushPromises()
    expect(wrapper.find('polyline').attributes('points')).toBe('1.0,58.0 40.3,32.0 79.7,6.0 119.0,32.0')
  })
  it('每分钟刷新；失败保留上次实时行情，隐藏和卸载停止，重新进入立即获取', async () => {
    vi.useFakeTimers()
    selectionMock.getQuotes.mockResolvedValue([{ symbol: '600001', price: 9, changeAmount: -1, changePct: -10 }])
    const wrapper = mount(AiPickContent)
    await flushPromises()
    expect(wrapper.find('.stock-change').text()).toBe('-1.00（-10.00%）')
    expect(wrapper.find('.stock-change').classes()).toContain('is-down')
    selectionMock.getQuotes.mockRejectedValueOnce(new Error('temporary failure'))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(selectionMock.getQuotes).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.stock-price').text()).toBe('9.00')
    await wrapper.setProps({ active: false })
    await vi.advanceTimersByTimeAsync(120_000)
    expect(selectionMock.getQuotes).toHaveBeenCalledTimes(2)
    selectionMock.getQuotes.mockResolvedValue([{ symbol: '600001', price: 9.5, changeAmount: -.5, changePct: -5 }])
    await wrapper.setProps({ active: true })
    await flushPromises()
    expect(wrapper.find('.stock-price').text()).toBe('9.50')
    wrapper.unmount()
    const count = selectionMock.getQuotes.mock.calls.length
    await vi.advanceTimersByTimeAsync(120_000)
    expect(selectionMock.getQuotes).toHaveBeenCalledTimes(count)
  })
  it('切换周期后迟到的行情响应不能覆盖新名单', async () => {
    let oldResponse!: (value: unknown) => void
    selectionMock.getQuotes.mockReturnValueOnce(new Promise(resolve => { oldResponse = resolve }))
    const wrapper = mount(AiPickContent)
    await flushPromises()
    selectionMock.getQuotes.mockResolvedValue([{ symbol: '600001', price: 30, changeAmount: 1, changePct: 3 }])
    await wrapper.findAll('.horizon-chip').find(n => n.text() === '短线机会')!.trigger('tap')
    await flushPromises()
    oldResponse([{ symbol: '600001', price: 999, changeAmount: 888, changePct: 777 }])
    await flushPromises()
    expect(wrapper.find('.stock-price').text()).toBe('30.00')
  })
})
