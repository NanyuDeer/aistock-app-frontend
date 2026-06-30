/**
 * 市场概览状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { stockApi } from '@/api/modules/stock'
import { getMarketStatus } from '@/utils/tradingTime'

export const useMarketStore = defineStore('market', () => {
  const marketStatus = ref(getMarketStatus())
  const indices = ref<Array<{ name: string; code: string; price: number; changePercent: number }>>([])
  const loading = ref(false)
  const lastUpdate = ref<number>(0)

  /** 刷新市场状态文案 */
  function refreshStatus() {
    marketStatus.value = getMarketStatus()
  }

  /** 加载大盘指数行情 */
  async function fetchIndices() {
    loading.value = true
    try {
      // 上证指数、深证成指、创业板指
      const symbols = ['sh000001', 'sz399001', 'sz399006']
      const quotes = await stockApi.getCoreQuotes(symbols)
      indices.value = quotes.map((q: any) => ({
        name: mapIndexName(q.symbol),
        code: q.symbol,
        price: q.price,
        changePercent: q.changePercent
      }))
      lastUpdate.value = Date.now()
    } catch (e) {
      console.warn('[MarketStore] fetchIndices failed:', e)
    } finally {
      loading.value = false
    }
  }

  function mapIndexName(code: string): string {
    const map: Record<string, string> = {
      'sh000001': '上证指数',
      'sz399001': '深证成指',
      'sz399006': '创业板指'
    }
    return map[code] || code
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
