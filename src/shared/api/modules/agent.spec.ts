import assert from 'node:assert/strict'
import { test } from 'node:test'
import path from 'node:path'
import Request from 'luch-request'
import { createServer } from 'vite'

test('市场复盘问答请求使用独立的较长超时', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    server: { middlewareMode: true },
    appType: 'custom',
  })

  try {
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const { MARKET_TRACE_QA_TIMEOUT } = agentModule
    const request = requestModule.default
    const originalPost = request.post
    const calls: Array<{ url: string; data: unknown; config: unknown }> = []

    request.post = ((url: string, data?: unknown, config?: unknown) => {
      calls.push({ url, data, config })
      return Promise.resolve({
        content: '市场复盘结果',
        session_id: 'session-1',
        trace: {
          artifact_id: 'artifact-1',
          sources: [],
          as_of: '2026-07-23T15:00:00+08:00',
          confidence: 'medium',
          uncertainty: [],
          degraded: false,
          degraded_reason: null,
        },
      })
    }) as typeof request.post

    try {
      await agentModule.agentApi.sendMarketTraceQaMessage('大盘为何涨跌', '2026-07-23', 'session-1')
    } finally {
      request.post = originalPost
    }

    assert.deepEqual(calls, [{
      url: '/agent/market-trace-qa/message',
      data: {
        message: '大盘为何涨跌',
        report_date: '2026-07-23',
        session_id: 'session-1',
      },
      config: { timeout: MARKET_TRACE_QA_TIMEOUT },
    }])
  } finally {
    await server.close()
  }
})

test('Brief v1 与双人播报按早晚类型和日期请求 Node 公开接口', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { middlewareMode: true },
    appType: 'custom',
  })

  try {
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const request = requestModule.default
    const originalGet = request.get
    const calls: string[] = []
    request.get = ((url: string) => {
      calls.push(url)
      return Promise.resolve({})
    }) as typeof request.get

    try {
      await agentModule.agentApi.getBrief('morning', '2026-07-24')
      await agentModule.agentApi.getBrief('evening', '2026-07-24')
      await agentModule.agentApi.getBroadcast('evening', '2026-07-24')
    } finally {
      request.get = originalGet
    }

    assert.deepEqual(calls, [
      '/agent/brief/morning/2026-07-24',
      '/agent/brief/evening/2026-07-24',
      '/agent/broadcast/evening/2026-07-24',
    ])
  } finally {
    await server.close()
  }
})

test('request.post 将独立超时传给 luch-request', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    server: { middlewareMode: true },
    appType: 'custom',
  })
  const originalPost = Request.prototype.post
  const calls: Array<{ url: string; data: unknown; config: unknown }> = []

  Request.prototype.post = ((url: string, data?: unknown, config?: unknown) => {
    calls.push({ url, data, config })
    return Promise.resolve({})
  }) as unknown as typeof Request.prototype.post

  try {
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const { MARKET_TRACE_QA_TIMEOUT } = agentModule
    await requestModule.default.post('/agent/market-trace-qa/message', { message: '测试' }, {
      timeout: MARKET_TRACE_QA_TIMEOUT,
    })

    assert.deepEqual(calls, [{
      url: '/agent/market-trace-qa/message',
      data: { message: '测试' },
      config: { header: undefined, timeout: MARKET_TRACE_QA_TIMEOUT },
    }])
  } finally {
    Request.prototype.post = originalPost
    await server.close()
  }
})
