/**
 * 自选股状态管理
 * 未登录时使用演示数据，登录后以服务器完整列表为唯一数据源。
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
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
  /**
   * 记录最近一次加载完成时的登录状态（true=已登录，false=未登录，null=尚未加载）。
   * 页面用它判断 stocks 是否为"当前登录状态下"的数据：
   * 登录后首次进入自选页时，store 内存中可能残留未登录时的 mock 数据，
   * 若直接渲染会造成"闪一下旧数据再跳到真实自选股"的体验问题。
   */
  const loadedForLoggedIn = ref<boolean | null>(null)
  let syncPromise: Promise<boolean> | null = null

  // 登录状态变化（登出/登录/切换用户）时，内存中残留的旧数据不再可信，
  // 重置为"未就绪"，页面重新走 loading → 拉取流程，避免闪现上一个登录状态的数据
  watch(
    () => useUserStore().token,
    () => {
      loadedForLoggedIn.value = null
    },
  )

  /** 当前登录状态下的数据是否已就绪（false 时页面应显示 loading 而非渲染旧数据） */
  function hasCurrentData(): boolean {
    return loadedForLoggedIn.value === useUserStore().isLoggedIn()
  }

  function replaceWithServerStocks(data: ApiFavoriteStock[]) {
    const list = Array.isArray(data) ? data : []
    // 服务端自选股列表不含行情价格（/users/me 仅返回代码/名称/市场/添加时间），
    // 合并旧数据中已刷新的价格，避免每次同步时价格被清成 '--' 再异步刷出（页面闪一下）
    const priceMap = new Map(stocks.value.map((s) => [s.symbol, s]))
    stocks.value = list.map((item) => {
      const prev = priceMap.get(item.symbol)
      return prev?.price != null && prev.changePercent != null
        ? { ...item, price: prev.price, changePercent: prev.changePercent }
        : item
    })
    storage.set(STORAGE_KEYS.FAVORITES, stocks.value)
  }

  async function fetchFavorites(options: SyncOptions = {}) {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn()) {
      syncError.value = ''
      stocks.value = MOCK_FAVORITES
      // 等待行情就绪后再标记加载完成，避免价格从 '--' 再异步刷出（页面闪一下）
      await refreshQuotes()
      loadedForLoggedIn.value = false
      return false
    }

    if (syncPromise) return syncPromise

    syncPromise = (async () => {
      syncing.value = true
      syncError.value = ''
      try {
        const data = await stockApi.getFavorites()
        replaceWithServerStocks(data)
        // 等待行情就绪后再标记加载完成，loading 直接展示完整数据（含价格）
        await refreshQuotes()
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
        // 无论成功/失败，均以"当前登录状态"标记加载完成，
        // 让页面在加载完成后立即展示（旧数据 + 错误提示），避免一直停留在 loading
        loadedForLoggedIn.value = userStore.isLoggedIn()
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

  /** 批量添加自选（OCR 识图勾选后一次性提交，减少请求数） */
  async function addMany(items: Array<{ symbol: string; name: string }>) {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn()) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return false
    }
    const symbols = items.map(item => item.symbol)
    const toAdd = symbols.filter(symbol => !stocks.value.some(stock => stock.symbol === symbol))
    if (!toAdd.length) {
      uni.showToast({ title: '所选股票已在自选中', icon: 'none' })
      return true
    }
    pendingSymbols.value = [...pendingSymbols.value, ...toAdd]
    try {
      const data = await stockApi.addFavorites(toAdd)
      replaceWithServerStocks(data)
      void refreshQuotes()
      return true
    } catch (error: unknown) {
      if (getErrorStatus(error) === 401) userStore.clearSession()
      uni.showToast({ title: '添加自选失败，请重试', icon: 'none' })
      return false
    } finally {
      pendingSymbols.value = pendingSymbols.value.filter(item => !toAdd.includes(item))
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
    hasCurrentData,
    fetchFavorites,
    refreshQuotes,
    add,
    addMany,
    remove,
    isFavorite,
    isPending,
  }
})
