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
