import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

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

describe('AiPickContent 策略筛选（与结果同一页）', () => {
  beforeEach(() => {
    vi.mocked(uni.getStorageSync).mockReturnValue('')
    vi.mocked(uni.setStorageSync).mockClear()
    vi.mocked(uni.showToast).mockClear()
    selectionMock.getLatest.mockResolvedValue({
      status: 'ready',
      stocks: [
        { symbol: '600001', name: '大涨弱量', price: 20, changePct: 9, reason: ['a'], rank: 1, recommendationLevel: '较高', riskTip: '', factors: { mainNetRatio: 0.1, turnoverRatePct: 0.2, amount: 8, return5dPct: -2 } },
        { symbol: '600002', name: '量价更强', price: 10, changePct: 1, reason: ['b'], rank: 2, recommendationLevel: '较高', riskTip: '', factors: { mainNetRatio: 15, turnoverRatePct: 9, amount: 900, return5dPct: 7, newsCount: 0, themeCount: 0, aboveMa5: false, aboveMa20: false, maxDrawdown20dPct: -12 } },
      ],
    })
  })

  it('默认是 AI综合：不展示方法，按涨跌幅排序', async () => {
    const wrapper = mount(AiPickContent)
    await vi.dynamicImportSettled()

    expect(wrapper.find('.horizon-chip.active').text()).toBe('AI综合')
    expect(wrapper.find('.filter-meta').text()).toBe('当前：AI综合')
    expect(wrapper.find('.method-chip').exists()).toBe(false)
    expect(wrapper.findAll('.stock-name').map((node) => node.text())).toEqual(['大涨弱量', '量价更强'])
    expect(wrapper.text()).not.toContain('查看筛选依据')
    expect(wrapper.text()).not.toContain('风险偏好')
  })

  it('新方法可多选，但不会将AI综合名单重排成独立方法的结果', async () => {
    const wrapper = mount(AiPickContent)
    await vi.dynamicImportSettled()
    await wrapper.findAll('.horizon-chip').find((node) => node.text() === '短线机会')!.trigger('tap')

    const methods = wrapper.findAll('.method-chip')
    expect(methods.map((node) => node.text())).toEqual(['事件催化', '放量突破', '强势延续', '涨停打板'])
    expect(wrapper.findAll('.method-chip.active').map((node) => node.text())).toEqual(['事件催化'])
    await methods.find((node) => node.text() === '放量突破')!.trigger('tap')
    await wrapper.findAll('.method-chip').find((node) => node.text() === '事件催化')!.trigger('tap')

    expect(wrapper.findAll('.method-chip.active').map((node) => node.text())).toEqual(['放量突破'])
    expect(wrapper.find('.stock-name').exists()).toBe(false)
    expect(wrapper.find('.ai-pick-state').text()).toBe('暂无所选方法的选股结果')

    await wrapper.findAll('.horizon-chip').find((node) => node.text() === 'AI综合')!.trigger('tap')
    expect(wrapper.findAll('.stock-name').map((node) => node.text())).toEqual(['大涨弱量', '量价更强'])
  })

  it('选中方法显示取消图标，最后一个方法也可再次点击取消并保存', async () => {
    const wrapper = mount(AiPickContent)
    await vi.dynamicImportSettled()
    await wrapper.findAll('.horizon-chip').find((node) => node.text() === '中长线配置')!.trigger('tap')
    expect(wrapper.find('.filter-meta').text()).toBe('方法可多选')
    expect(wrapper.find('.method-remove').exists()).toBe(true)
    await wrapper.find('.method-remove').trigger('tap')

    expect(wrapper.find('.method-chip.active').exists()).toBe(false)
    expect(wrapper.find('.method-remove').exists()).toBe(false)
    expect(uni.setStorageSync).toHaveBeenLastCalledWith('ai_stock_selection_strategy_preference', { v: 3, horizon: 'long', methods: [] })
    expect(wrapper.find('.stock-name').exists()).toBe(false)
    expect(wrapper.find('.ai-pick-state').text()).toBe('请选择选股方法')
  })

  it('重新进入时保留全部取消的方法选择', async () => {
    vi.mocked(uni.getStorageSync).mockReturnValue({ v: 2, horizon: 'short', methods: [] } as never)
    const wrapper = mount(AiPickContent)
    await vi.dynamicImportSettled()

    expect(wrapper.find('.horizon-chip.active').text()).toBe('短线机会')
    expect(wrapper.findAll('.method-chip')).toHaveLength(4)
    expect(wrapper.find('.method-chip.active').exists()).toBe(false)
  })

  it.each([
    ['波段趋势', ['趋势跟随', '回踩企稳', '盈利预期上修', '行业强势']],
    ['中长线配置', ['优质成长', '合理估值成长', '红利稳健']],
  ])('%s展示确认的方法目录', async (horizon, expected) => {
    const wrapper = mount(AiPickContent)
    await vi.dynamicImportSettled()
    await wrapper.findAll('.horizon-chip').find((node) => node.text() === horizon)!.trigger('tap')

    expect(wrapper.findAll('.method-chip').map((node) => node.text())).toEqual(expected)
    expect(wrapper.find('.stock-name').exists()).toBe(false)
  })

  it('迁移旧方法偏好到新目录', async () => {
    vi.mocked(uni.getStorageSync).mockReturnValue({ v: 2, horizon: 'short', methods: ['volume_price', 'short_trend'] } as never)
    const wrapper = mount(AiPickContent)
    await vi.dynamicImportSettled()

    expect(wrapper.findAll('.method-chip.active').map((node) => node.text())).toEqual(['放量突破', '强势延续'])
  })

  it('已移除的机构共振不会被误映射成新方法', async () => {
    vi.mocked(uni.getStorageSync).mockReturnValue({ v: 2, horizon: 'swing', methods: ['institution_resonance'] } as never)
    const wrapper = mount(AiPickContent)
    await vi.dynamicImportSettled()

    expect(wrapper.find('.method-chip.active').exists()).toBe(false)
    expect(wrapper.find('.ai-pick-state').text()).toBe('请选择选股方法')
  })
})

describe('AiPickContent 列表排序（按当日涨跌幅降序）', () => {
  beforeEach(() => {
    vi.mocked(uni.getStorageSync).mockReturnValue('')
    favoritesMock.favorites.clear()
    favoritesMock.pending.clear()
    vi.mocked(uni.showToast).mockClear()
  })

  it('涨跌幅降序：涨幅最大的排最前，与接口返回顺序无关', async () => {
    selectionMock.getLatest.mockResolvedValue({
      status: 'ready',
      stocks: [
        { symbol: '600001', name: '小涨股', price: 10, changePct: 1.2, reason: ['a'], rank: 1, recommendationLevel: '较高', riskTip: '' },
        { symbol: '600002', name: '大涨股', price: 20, changePct: 9.8, reason: ['b'], rank: 2, recommendationLevel: '较高', riskTip: '' },
        { symbol: '600003', name: '下跌股', price: 30, changePct: -3.5, reason: ['c'], rank: 3, recommendationLevel: '较高', riskTip: '' },
      ],
    })
    const wrapper = mount(AiPickContent)
    await vi.dynamicImportSettled()
    const names = wrapper.findAll('.stock-name').map((el) => el.text())
    expect(names).toEqual(['大涨股', '小涨股', '下跌股'])
  })

  it('涨跌幅缺失的股票排到最后（不插入涨幅序列中间）', async () => {
    selectionMock.getLatest.mockResolvedValue({
      status: 'ready',
      stocks: [
        { symbol: '600011', name: '停牌股', price: null, changePct: null, reason: ['a'], rank: 1, recommendationLevel: '较高', riskTip: '' },
        { symbol: '600012', name: '小涨股', price: 10, changePct: 0.5, reason: ['b'], rank: 2, recommendationLevel: '较高', riskTip: '' },
        { symbol: '600013', name: '大涨股', price: 20, changePct: 6.6, reason: ['c'], rank: 3, recommendationLevel: '较高', riskTip: '' },
      ],
    })
    const wrapper = mount(AiPickContent)
    await vi.dynamicImportSettled()
    const names = wrapper.findAll('.stock-name').map((el) => el.text())
    expect(names).toEqual(['大涨股', '小涨股', '停牌股'])
  })
})
