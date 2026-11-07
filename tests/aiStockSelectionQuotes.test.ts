import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const http = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/shared/api/request', () => ({ default: http }))
import { aiStockSelectionApi } from '@/shared/api/modules/ai-stock-selection'

describe('选股卡片批量实时行情', () => {
  beforeEach(() => http.get.mockReset())
  afterEach(() => vi.useRealTimers())
  it('使用同源轻量core行情，去重代码并保留涨跌额、涨跌幅与交易日期', async () => {
    http.get.mockResolvedValue({ 行情: [{ 股票代码: '603707', 最新价: '61.02', 涨跌额: '0.49', 涨跌幅: '0.81', 行情时间: '20261106144000' }] })
    expect(await aiStockSelectionApi.getQuotes(['603707', '603707'])).toEqual([
      { symbol: '603707', price: 61.02, changeAmount: .49, changePct: .81, tradeDate: '2026-11-06' },
    ])
    expect(http.get).toHaveBeenCalledWith('/cn/stock/quotes/core', { params: { symbols: '603707' } })
  })
  it('缺失不补零；0涨幅保留，缺失价格时不展示虚假涨幅', async () => {
    http.get.mockResolvedValue({ data: { 行情: [
      { 股票代码: '600001', 最新价: 10, 涨跌额: 0, 涨跌幅: 0 },
      { 股票代码: '600002', 最新价: '--', 涨跌额: '', 涨跌幅: null },
    ] } })
    const q = await aiStockSelectionApi.getQuotes(['600001', '600002'])
    expect(q[0]).toMatchObject({ price: 10, changeAmount: 0, changePct: 0 })
    expect(q[1]).toMatchObject({ price: null, changeAmount: null, changePct: null })
  })
  it('空名单不发起请求', async () => {
    expect(await aiStockSelectionApi.getQuotes([])).toEqual([])
    expect(http.get).not.toHaveBeenCalled()
  })
  it('切换方法可复用一分钟内的真实行情，超时和无效行情不命中缓存', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    http.get.mockResolvedValue({ 行情: [
      { 股票代码: '600888', 最新价: 10, 涨跌额: 1, 涨跌幅: 11.11 },
      { 股票代码: '600889', 最新价: '--' },
    ] })
    await aiStockSelectionApi.getQuotes(['600888', '600889'])
    expect(aiStockSelectionApi.getCachedQuotes(['600888', '600889'])['600888'].price).toBe(10)
    expect(aiStockSelectionApi.getCachedQuotes(['600889'])).toEqual({})
    vi.advanceTimersByTime(59_999)
    expect(aiStockSelectionApi.getCachedQuotes(['600888'])['600888'].price).toBe(10)
    vi.advanceTimersByTime(1)
    expect(aiStockSelectionApi.getCachedQuotes(['600888'])).toEqual({})
  })

})
