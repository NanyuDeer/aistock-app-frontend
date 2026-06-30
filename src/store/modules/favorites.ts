/**
 * 自选股状态管理
 * 未登录时使用模拟数据，登录后从后端获取
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { stockApi } from '@/api/modules/stock'
import { storage, STORAGE_KEYS } from '@/utils/storage'
import { useUserStore } from './user'

export interface FavoriteStock {
  symbol: string
  name: string
  price?: number
  changePercent?: number
}

// 未登录时的模拟自选股（热门股票）
const MOCK_FAVORITES: FavoriteStock[] = [
  { symbol: '600519', name: '贵州茅台' },
  { symbol: '300750', name: '宁德时代' },
  { symbol: '000001', name: '平安银行' },
  { symbol: '601318', name: '中国平安' },
  { symbol: '000858', name: '五粮液' },
]

export const useFavoritesStore = defineStore('favorites', () => {
  const stocks = ref<FavoriteStock[]>(storage.get(STORAGE_KEYS.FAVORITES) || [])

  async function fetchFavorites() {
    const userStore = useUserStore()
    // 未登录时使用模拟数据
    if (!userStore.isLoggedIn()) {
      stocks.value = MOCK_FAVORITES
      // 拉取实时行情补充 price / changePercent
      refreshQuotes()
      return
    }
    try {
      const data: any = await stockApi.getFavorites()
      stocks.value = data || []
      storage.set(STORAGE_KEYS.FAVORITES, stocks.value)
      // 同步实时行情
      refreshQuotes()
    } catch (e) {
      // 登录后获取失败，回退到模拟数据
      stocks.value = MOCK_FAVORITES
      refreshQuotes()
    }
  }

  /** 批量拉取自选股实时行情，回填 price / changePercent */
  async function refreshQuotes() {
    const symbols = stocks.value.map(s => s.symbol).filter(Boolean)
    if (!symbols.length) return
    try {
      const quotes = await stockApi.getCoreQuotes(symbols)
      const map = new Map<string, { price: number; changePercent: number }>()
      quotes.forEach((q: any) => {
        if (q?.symbol) map.set(q.symbol, { price: q.price, changePercent: q.changePercent })
      })
      stocks.value = stocks.value.map(s => {
        const q = map.get(s.symbol)
        return q ? { ...s, price: q.price, changePercent: q.changePercent } : s
      })
    } catch (e) {
      // 行情拉取失败不影响列表展示
      console.warn('[FavoritesStore] refreshQuotes failed:', e)
    }
  }

  async function add(symbol: string, name: string) {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn()) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    await stockApi.addFavorites([symbol])
    stocks.value.push({ symbol, name })
    storage.set(STORAGE_KEYS.FAVORITES, stocks.value)
  }

  async function remove(symbol: string) {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn()) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    await stockApi.removeFavorites([symbol])
    stocks.value = stocks.value.filter((s: FavoriteStock) => s.symbol !== symbol)
    storage.set(STORAGE_KEYS.FAVORITES, stocks.value)
  }

  function isFavorite(symbol: string) {
    return stocks.value.some(s => s.symbol === symbol)
  }

  return { stocks, fetchFavorites, refreshQuotes, add, remove, isFavorite }
})
