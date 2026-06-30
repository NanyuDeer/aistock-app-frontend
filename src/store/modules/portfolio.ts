/**
 * 持仓状态管理
 * 注：依赖后端持仓 API，当前后端为 TODO，store 提供本地结构供页面使用
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { portfolioApi, type HoldingStock } from '@/api/modules/portfolio'

export const usePortfolioStore = defineStore('portfolio', () => {
  const holdings = ref<HoldingStock[]>([])
  const loading = ref(false)
  const error = ref<string>('')

  const totalCost = computed(() =>
    holdings.value.reduce((sum, h) => sum + h.costPrice * h.amount, 0)
  )
  const totalValue = computed(() =>
    holdings.value.reduce((sum, h) => sum + (h.currentPrice || h.costPrice) * h.amount, 0)
  )
  const totalProfit = computed(() => totalValue.value - totalCost.value)
  const totalProfitPercent = computed(() =>
    totalCost.value > 0 ? (totalProfit.value / totalCost.value) * 100 : 0
  )

  async function fetchOverview() {
    loading.value = true
    error.value = ''
    try {
      const data: any = await portfolioApi.getOverview()
      holdings.value = data?.holdings || []
    } catch (e: any) {
      // 后端 TODO 或 DB 不可用时，空持仓
      error.value = e.message || '获取持仓失败'
      holdings.value = []
    } finally {
      loading.value = false
    }
  }

  function clear() {
    holdings.value = []
    error.value = ''
  }

  return {
    holdings,
    loading,
    error,
    totalCost,
    totalValue,
    totalProfit,
    totalProfitPercent,
    fetchOverview,
    clear
  }
})
