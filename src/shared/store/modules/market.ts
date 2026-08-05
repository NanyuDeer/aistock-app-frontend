/**
 * 市场概览状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { stockApi } from '@/shared/api/modules/stock'
import { getMarketStatus } from '@/shared/utils/tradingTime'

export const useMarketStore = defineStore('market', () => {
  const marketStatus = ref(getMarketStatus())
  const indices = ref<Array<{ name: string; code: string; price: number; changePercent: number }>>([])
  const loading = ref(false)
  const lastUpdate = ref<number>(0)

  /** 刷新市场状态文案 */
  function refreshStatus() {
    marketStatus.value = getMarketStatus()
  }

  /** 加载大盘指数行情（纯数字代码 → /api/cn/index/quotes，000001=上证指数） */
  async function fetchIndices() {
    loading.value = true
    try {
      // 上证指数、深证成指、创业板指（纯数字代码，指数接口语义；服务端直接返回指数名称）
      const quotes = await stockApi.getCnIndexQuotes(['000001', '399001', '399006'])
      indices.value = quotes.map((q) => ({
        name: q.name,
        code: q.index,
        price: q.price ?? 0,
        changePercent: q.changePercent ?? 0,
      }))
      lastUpdate.value = Date.now()
    } catch (e) {
      console.warn('[MarketStore] fetchIndices failed:', e)
    } finally {
      loading.value = false
    }
  }

  return {
    marketStatus,
    indices,
    loading,
    lastUpdate,
    refreshStatus,
    fetchIndices
  }
})
