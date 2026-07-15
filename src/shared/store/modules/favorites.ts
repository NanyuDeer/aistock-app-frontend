/**
 * 自选股状态管理
 * 未登录时使用演示数据，登录后以服务器完整列表为唯一数据源。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { stockApi, type FavoriteStock as ApiFavoriteStock } from '@/shared/api/modules/stock'
import { storage, STORAGE_KEYS } from '@/shared/utils/storage'
import { useUserStore } from './user'

export interface FavoriteStock {
  symbol: string
  name: string
  price?: number
  changePercent?: number
  market?: string | null
  addedAt?: string | null
}

const MOCK_FAVORITES: FavoriteStock[] = [
  { symbol: '600519', name: '贵州茅台' },
  { symbol: '300750', name: '宁德时代' },
  { symbol: '000001', name: '平安银行' },
  { symbol: '601318', name: '中国平安' },
  { symbol: '000858', name: '五粮液' },
]

interface SyncOptions {
  silent?: boolean
}

function getErrorStatus(error: unknown): number | undefined {
  return (error as { statusCode?: number } | null)?.statusCode
}

export const useFavoritesStore = defineStore('favorites', () => {
  const stocks = ref<FavoriteStock[]>(storage.get(STORAGE_KEYS.FAVORITES) || [])
  const syncing = ref(false)
  const syncError = ref('')
  const pendingSymbols = ref<string[]>([])
  let syncPromise: Promise<boolean> | null = null

  function replaceWithServerStocks(data: ApiFavoriteStock[]) {
    stocks.value = Array.isArray(data) ? data : []
    storage.set(STORAGE_KEYS.FAVORITES, stocks.value)
  }

  async function fetchFavorites(options: SyncOptions = {}) {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn()) {
      syncError.value = ''
      stocks.value = MOCK_FAVORITES
      void refreshQuotes()
      return false
    }

    if (syncPromise) return syncPromise

    syncPromise = (async () => {
      syncing.value = true
      syncError.value = ''
      try {
        const data = await stockApi.getFavorites()
        replaceWithServerStocks(data)
        void refreshQuotes()
        return true
      } catch (error: unknown) {
        if (getErrorStatus(error) === 401) {
          userStore.clearSession()
          stocks.value = []
          storage.remove(STORAGE_KEYS.FAVORITES)
          return false
        }

        const detail = error as { errMsg?: string; message?: string }
        syncError.value = detail?.errMsg || detail?.message || '自选股同步失败'
        if (!options.silent) {
          uni.showToast({ title: '同步失败，已保留上次数据', icon: 'none' })
        }
        return false
      } finally {
        syncing.value = false
        syncPromise = null
      }
    })()

    return syncPromise
  }

  async function refreshQuotes() {
    const symbols = stocks.value.map(stock => stock.symbol).filter(Boolean)
    if (!symbols.length) return

    try {
      const quotes = await stockApi.getCoreQuotes(symbols)
      const quoteMap = new Map<string, { price: number; changePercent: number }>()
      quotes.forEach((quote: { symbol?: string; price: number; changePercent: number }) => {
        if (quote?.symbol) {
          quoteMap.set(quote.symbol, { price: quote.price, changePercent: quote.changePercent })
        }
      })
      stocks.value = stocks.value.map(stock => {
        const quote = quoteMap.get(stock.symbol)
        return quote ? { ...stock, price: quote.price, changePercent: quote.changePercent } : stock
      })
    } catch (error: unknown) {
      console.warn('[FavoritesStore] refreshQuotes failed:', error)
    }
  }

  async function add(symbol: string, _name: string) {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn()) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return false
    }
    if (pendingSymbols.value.includes(symbol)) return false

    pendingSymbols.value = [...pendingSymbols.value, symbol]
    try {
      const data = await stockApi.addFavorites([symbol])
      replaceWithServerStocks(data)
      void refreshQuotes()
      return true
    } catch (error: unknown) {
      if (getErrorStatus(error) === 401) userStore.clearSession()
      uni.showToast({ title: '添加自选失败，请重试', icon: 'none' })
      return false
    } finally {
      pendingSymbols.value = pendingSymbols.value.filter(item => item !== symbol)
    }
  }

  async function remove(symbol: string) {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn()) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return false
    }
    if (pendingSymbols.value.includes(symbol)) return false

    pendingSymbols.value = [...pendingSymbols.value, symbol]
    try {
      const data = await stockApi.removeFavorites([symbol])
      replaceWithServerStocks(data)
      void refreshQuotes()
      return true
    } catch (error: unknown) {
      if (getErrorStatus(error) === 401) userStore.clearSession()
      uni.showToast({ title: '移除自选失败，请重试', icon: 'none' })
      return false
    } finally {
      pendingSymbols.value = pendingSymbols.value.filter(item => item !== symbol)
    }
  }

  function isFavorite(symbol: string) {
    return stocks.value.some(stock => stock.symbol === symbol)
  }

  function isPending(symbol: string) {
    return pendingSymbols.value.includes(symbol)
  }

  return {
    stocks,
    syncing,
    syncError,
    pendingSymbols,
    fetchFavorites,
    refreshQuotes,
    add,
    remove,
    isFavorite,
    isPending,
  }
})
