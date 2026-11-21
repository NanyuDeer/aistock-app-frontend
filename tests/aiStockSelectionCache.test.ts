import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const http = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/shared/api/request', () => ({ default: http }))
let api: typeof import('@/shared/api/modules/ai-stock-selection').aiStockSelectionApi
const ready = { status: 'ready', tradeDate: '2026-11-20', stocks: [] }
beforeEach(async () => {
  vi.resetModules()
  http.get.mockReset()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-20T08:00:00Z'))
  api = (await import('@/shared/api/modules/ai-stock-selection')).aiStockSelectionApi
})
afterEach(() => vi.useRealTimers())

it('切回已加载方法复用结果，方法顺序不影响缓存，周期和组合相互隔离', async () => {
  http.get.mockResolvedValue(ready)
  await api.getResults('short', ['volume_breakout', 'momentum_continuation'])
  await api.getResults('long', ['quality_growth'])
  await api.getResults('short', ['momentum_continuation', 'volume_breakout', 'volume_breakout'])
  expect(http.get).toHaveBeenCalledTimes(2)
  await api.getResults('short', ['volume_breakout'])
  expect(http.get).toHaveBeenCalledTimes(3)
})
it('加载中的相同查询只发一次请求', async () => {
  let resolve!: (value: typeof ready) => void
  http.get.mockReturnValue(new Promise(r => { resolve = r }))
  const first = api.getResults('short', ['volume_breakout'])
  const second = api.getResults('short', ['volume_breakout'])
  expect(http.get).toHaveBeenCalledTimes(1)
  resolve(ready)
  expect(await first).toEqual(await second)
})
it('一分钟后重取，手动刷新绕过缓存且更新缓存', async () => {
  http.get.mockResolvedValue(ready)
  await api.getLatest()
  vi.advanceTimersByTime(59_999)
  await api.getLatest()
  expect(http.get).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(1)
  await api.getLatest()
  const updated = { ...ready, runId: 28 }
  http.get.mockResolvedValue(updated)
  await api.getLatest(undefined, { force: true })
  expect(await api.getLatest()).toEqual(updated)
  expect(http.get).toHaveBeenCalledTimes(3)
})
it('请求失败后可以重试，不缓存不可用或生成中结果', async () => {
  http.get.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ status: 'unavailable', stocks: [] }).mockResolvedValueOnce({ status: 'generating', stocks: [] }).mockResolvedValue(ready)
  await expect(api.getResults('short', ['volume_breakout'])).rejects.toThrow('timeout')
  await api.getResults('short', ['volume_breakout'])
  await api.getResults('short', ['volume_breakout'])
  await api.getResults('short', ['volume_breakout'])
  await api.getResults('short', ['volume_breakout'])
  expect(http.get).toHaveBeenCalledTimes(4)
})
it('上海跨日立即失效，显式日期和最近批次缓存隔离', async () => {
  vi.setSystemTime(new Date('2026-11-20T15:59:50Z'))
  http.get.mockResolvedValue(ready)
  await api.getLatest()
  await api.getLatest('2026-11-20')
  vi.advanceTimersByTime(10_000)
  await api.getLatest()
  expect(http.get).toHaveBeenCalledTimes(3)
})
