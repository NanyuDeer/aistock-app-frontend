/**
 * 自选股组合式 Hook
 * 封装 favorites store 常用操作
 */
import { computed } from 'vue'
import { useFavoritesStore } from '@/shared/store/modules/favorites'

export function useFavorites() {
  const favoritesStore = useFavoritesStore()

  const stocks = computed(() => favoritesStore.stocks)
  const count = computed(() => favoritesStore.stocks.length)

  function isFavorite(symbol: string) {
    return favoritesStore.isFavorite(symbol)
  }

  async function toggle(symbol: string, name: string) {
    if (isFavorite(symbol)) {
      await favoritesStore.remove(symbol)
      uni.showToast({ title: '已移除自选', icon: 'none' })
    } else {
      await favoritesStore.add(symbol, name)
      uni.showToast({ title: '已加入自选', icon: 'none' })
    }
  }

  async function refresh() {
    await favoritesStore.fetchFavorites()
  }

  async function refreshQuotes() {
    await favoritesStore.refreshQuotes()
  }

  return {
    stocks,
    count,
    isFavorite,
    toggle,
    refresh,
    refreshQuotes
  }
}
