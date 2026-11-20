import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import path from 'node:path'

test('完整窗口单次读取超过200条；显式分页保留；旧后端截断时拒绝替换榜单', async () => {
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } }, server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  try {
    const request = (await server.ssrLoadModule('/src/shared/api/request.ts')).default
    const { stockApi } = await server.ssrLoadModule('/src/shared/api/modules/stock.ts')
    const calls: Array<{ all?: boolean; limit?: number }> = []
    let truncated = false
    request.get = async (_url: string, options: { params: { all?: boolean; limit?: number } }) => {
      calls.push(options.params)
      return { total: 203, records: Array.from({ length: truncated ? 50 : 203 }, (_, i) => ({ symbol: String(i) })) }
    }
    const result = await stockApi.getHotBurstHistory({ trading_days: 3, min_resonance: 2 })
    assert.equal(result.length, 203)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].all, true)
    await stockApi.getHotBurstHistory({ trading_days: 3, min_resonance: 2, limit: 200 })
    assert.equal(calls[1].all, undefined)
    assert.equal(calls[1].limit, 200)
    truncated = true
    await assert.rejects(stockApi.getHotBurstHistory({ trading_days: 3, min_resonance: 2 }), /更新服务端/)
  } finally {
    await server.close()
  }
})
