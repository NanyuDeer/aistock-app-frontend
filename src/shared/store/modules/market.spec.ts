import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const getCnIndexQuotes = vi.fn()

vi.mock('@/shared/api/modules/stock', () => ({
  stockApi: { getCnIndexQuotes: (...a: unknown[]) => getCnIndexQuotes(...a) },
}))
vi.mock('@/shared/utils/tradingTime', () => ({
  getMarketStatus: () => 'trading',
}))

import { useMarketStore } from './market'

describe('market store fetchIndices', () => {
  beforeEach(() => {
    getCnIndexQuotes.mockReset()
    // setup store 需要激活的 pinia 实例（未挂载 App 时 getActivePinia 会抛错）
    setActivePinia(createPinia())
    // 失败用例会触发 store 自身的 console.warn 兜底日志，静默以保持测试输出干净
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('映射中文键响应为 indices（纯数字代码，000001=上证指数）', async () => {
    getCnIndexQuotes.mockResolvedValue([
      { index: '000001', name: '上证指数', price: 3832.26, changePercent: 0.72, changeAmount: 27 },
      { index: '399001', name: '深证成指', price: 12000, changePercent: -0.5, changeAmount: -60 },
    ])
    const store = useMarketStore()
    await store.fetchIndices()
    expect(getCnIndexQuotes).toHaveBeenCalledWith(['000001', '399001', '399006'])
    expect(store.indices[0]).toMatchObject({ code: '000001', name: '上证指数', price: 3832.26, changePercent: 0.72 })
  })

  it('请求失败时保持空列表且不抛', async () => {
    getCnIndexQuotes.mockRejectedValue(new Error('network'))
    const store = useMarketStore()
    await store.fetchIndices()
    expect(store.indices).toEqual([])
    expect(store.loading).toBe(false)
  })
})
