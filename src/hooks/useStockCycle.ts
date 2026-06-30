/**
 * 股票周期管理 Hook
 * 提供 K 线周期切换、数据加载等能力
 */
import { ref, type Ref } from 'vue'
import { stockApi } from '@/api/modules/stock'
import type { KLineItem } from '@/api/modules/stock'

export type CyclePeriod = 'daily' | 'weekly' | 'monthly'

export function useStockCycle(symbol: Ref<string>) {
  const period = ref<CyclePeriod>('daily')
  const klineData = ref<KLineItem[]>([])
  const loading = ref(false)
  const error = ref<string>('')

  async function loadKLine() {
    if (!symbol.value) return
    loading.value = true
    error.value = ''
    try {
      const periodMap: Record<CyclePeriod, string> = {
        daily: 'daily',
        weekly: 'weekly',
        monthly: 'monthly'
      }
      const data: any = await stockApi.getKLine(symbol.value, {
        period: periodMap[period.value],
        count: 120
      })
      klineData.value = Array.isArray(data) ? data : (data?.data || [])
    } catch (e: any) {
      error.value = e.message || '加载失败'
      klineData.value = []
    } finally {
      loading.value = false
    }
  }

  function switchPeriod(p: CyclePeriod) {
    if (period.value === p) return
    period.value = p
    loadKLine()
  }

  return { period, klineData, loading, error, loadKLine, switchPeriod }
}
