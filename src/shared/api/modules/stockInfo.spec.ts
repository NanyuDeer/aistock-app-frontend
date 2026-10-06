import assert from 'node:assert/strict'
import { test } from 'node:test'
import path from 'node:path'
import { createServer } from 'vite'

function makeServer() {
  return createServer({
    root: process.cwd(),
    configFile: false,
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { middlewareMode: true },
    appType: 'custom',
  })
}

test('getLatestJudgement 命中返回 data', async () => {
  const server = await makeServer()
  try {
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const stockInfoModule = await server.ssrLoadModule('/src/shared/api/modules/stockInfo.ts')
    const request = requestModule.default
    const originalGet = request.get
    const calls: string[] = []
    request.get = ((url: string) => {
      calls.push(url)
      return Promise.resolve({
        code: 200,
        data: {
          symbol: '600383', stock_name: '金地集团', ai_impact: '利好',
          ai_horizon: '短期', ai_summary: '一句话结论', published_at: null, url: null,
        },
      })
    }) as typeof request.get
    try {
      const out = await stockInfoModule.getLatestJudgement('600383')
      assert.equal(out?.ai_summary, '一句话结论')
      assert.match(calls[0], /\/api\/cn\/stock-info\/latest/)
      assert.match(calls[0], /symbol=600383/)
    } finally {
      request.get = originalGet
    }
  } finally {
    await server.close()
  }
})

test('getLatestJudgement 无数据返回 null', async () => {
  const server = await makeServer()
  try {
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const stockInfoModule = await server.ssrLoadModule('/src/shared/api/modules/stockInfo.ts')
    const request = requestModule.default
    const originalGet = request.get
    request.get = (() => Promise.resolve({ code: 200, data: null })) as typeof request.get
    try {
      assert.equal(await stockInfoModule.getLatestJudgement('600383'), null)
    } finally {
      request.get = originalGet
    }
  } finally {
    await server.close()
  }
})
