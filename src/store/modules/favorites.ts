/**
 * 自选股状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { stockApi } from '@/api/modules/stock'
import { storage, STORAGE_KEYS } from '@/utils/storage'

export interface FavoriteStock {
  symbol: string
  name: string
  price?: number
  changePercent?: number
}

export const useFavoritesStore = defineStore('favorites', () => {
  const stocks = ref<FavoriteStock[]>(storage.get(STORAGE_KEYS.FAVORITES) || [])

  async function fetchFavorites() {
    try {
      const data: any = await stockApi.getFavorites()
      stocks.value = data || []
      storage.set(STORAGE_KEYS.FAVORITES, stocks.value)
    } catch (e) {
      console.error('[favorites] fetch failed:', e)
    }
  }

  async function add(symbol: string, name: string) {
    await stockApi.addFavorites([symbol])
    stocks.value.push({ symbol, name })
    storage.set(STORAGE_KEYS.FAVORITES, stocks.value)
  }

  async function remove(symbol: string) {
    await stockApi.removeFavorites([symbol])
    stocks.value = stocks.value.filter(s => s.symbol !== symbol)
    storage.set(STORAGE_KEYS.FAVORITES, stocks.value)
  }

  function isFavorite(symbol: string) {
    return stocks.value.some(s => s.symbol === symbol)
  }

  return { stocks, fetchFavorites, add, remove, isFavorite }
})
