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

describe('AiPickContent 列表排序（按当日涨跌幅降序）', () => {
  beforeEach(() => {
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
