import assert from 'node:assert/strict'
import { test } from 'node:test'
import path from 'node:path'
import { createServer } from 'vite'

test('大盘溯源读取固定走公开 review 报告接口', async () => {
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
    const request = requestModule.default
    const originalGet = request.get
    const calls: string[] = []

    request.get = ((url: string) => {
      calls.push(url)
      return Promise.resolve(null)
    }) as typeof request.get

    try {
      await agentModule.agentApi.getMarketTraceReview('2026-07-31')
    } finally {
      request.get = originalGet
    }

    assert.deepEqual(calls, ['/agent/report/review/2026-07-31'])
  } finally {
    await server.close()
  }
})

test('sendMessage 支持 forceDeep 透传（HTTP 降级对齐 WS）', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { middlewareMode: true },
    appType: 'custom',
    // pinia 需与测试运行环境隔离，避免 Node ESM 与 vite resolver 双实例导致
    // getActivePinia() 找不到 active pinia（useUserStore 依赖全局 active pinia）
    ssr: { noExternal: ['pinia'] },
  })

  try {
    // 通过 vite 模块图获取 pinia，保证与 agent.ts 依赖的 pinia 同一实例
    const piniaModule = await server.ssrLoadModule('pinia')
    piniaModule.setActivePinia(piniaModule.createPinia())
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const request = requestModule.default
    const originalPost = request.post
    const calls: Array<{ url: string; data: unknown; config: unknown }> = []

    request.post = ((url: string, data?: unknown, config?: unknown) => {
      calls.push({ url, data, config })
      return Promise.resolve({ content: 'ok', session_id: 's1' })
    }) as typeof request.post

    try {
      await agentModule.agentApi.sendMessage('深度分析一下600519', 's1', { forceDeep: true })
    } finally {
      request.post = originalPost
    }

    assert.deepEqual(calls, [{
      url: '/agent/chat/message',
      data: { message: '深度分析一下600519', session_id: 's1', force_deep: true },
      config: { timeout: 120000 }, // 56f631e 超时 15s→120s 后需同步断言
    }])
  } finally {
    await server.close()
  }
})

test('getTokenUsageSummary 请求公开累计端点 /chat/usage/summary', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { noExternal: ['pinia'] },
  })

  try {
    const piniaModule = await server.ssrLoadModule('pinia')
    piniaModule.setActivePinia(piniaModule.createPinia())
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const request = requestModule.default
    const originalGet = request.get
    const calls: string[] = []
    const summary = { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300, turn_count: 5 }

    request.get = ((url: string) => {
      calls.push(url)
      return Promise.resolve(summary)
    }) as typeof request.get

    try {
      const res = await agentModule.agentApi.getTokenUsageSummary()
      assert.deepEqual(calls, ['/chat/usage/summary'])
      assert.deepEqual(res, summary)
    } finally {
      request.get = originalGet
    }
  } finally {
    await server.close()
  }
})

// ── P10 线 6：会话维度用量 ──

test('getChatSessionUsage 走 GET /chat/usage/sessions 并返回 items', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { middlewareMode: true },
    appType: 'custom',
    // pinia 需与测试运行环境隔离，避免 Node ESM 与 vite resolver 双实例导致
    // getActivePinia() 找不到 active pinia（agent.ts 依赖 useUserStore）
    ssr: { noExternal: ['pinia'] },
  })

  try {
    const piniaModule = await server.ssrLoadModule('pinia')
    piniaModule.setActivePinia(piniaModule.createPinia())
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const request = requestModule.default
    const originalGet = request.get
    const calls: string[] = []
    const items = [
      { session_id: 'app_1', title: '今天大盘怎么样', total_tokens: 1500, turn_count: 5, last_used_at: '2026-08-05T02:00:00.000Z' },
    ]
    request.get = ((url: string) => {
      calls.push(url)
      return Promise.resolve({ items })
    }) as typeof request.get
    try {
      const res = await agentModule.agentApi.getChatSessionUsage()
      assert.deepEqual(res, { items })
    } finally {
      request.get = originalGet
    }
    assert.deepEqual(calls, ['/chat/usage/sessions'])
  } finally {
    await server.close()
  }
})

test('getChatSessionUsage 失败返回空 items（不抛）', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { noExternal: ['pinia'] },
  })

  try {
    const piniaModule = await server.ssrLoadModule('pinia')
    piniaModule.setActivePinia(piniaModule.createPinia())
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const request = requestModule.default
    const originalGet = request.get
    request.get = (() => Promise.reject(new Error('401'))) as typeof request.get
    try {
      // 不应 reject（内部 catch 静默返回空 items）
      const res = await agentModule.agentApi.getChatSessionUsage()
      assert.deepEqual(res, { items: [] })
    } finally {
      request.get = originalGet
    }
  } finally {
    await server.close()
  }
})

test('createAgentWebSocket URL 携带 token query（P0 WS 握手鉴权）', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: false,
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    server: { middlewareMode: true },
    appType: 'custom',
  })

  try {
    const savedUni = (globalThis as Record<string, unknown>).uni
    let capturedUrl = ''
    ;(globalThis as Record<string, unknown>).uni = {
      getStorageSync: () => 'tok_abc',
      connectSocket: (opts: { url: string }) => { capturedUrl = opts.url; return {} },
    }
    try {
      const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
      agentModule.createAgentWebSocket()
    } finally {
      ;(globalThis as Record<string, unknown>).uni = savedUni
    }
    assert.match(capturedUrl, /\/chat\?token=tok_abc$/)
  } finally {
    await server.close()
  }
})
