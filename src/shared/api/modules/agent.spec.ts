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
      return Promise.resolve({ content: 'ok', session_id: 's1', advisor_trace: null })
    }) as typeof request.post

    try {
      await agentModule.agentApi.sendMessage('深度分析一下600519', 's1', { forceDeep: true })
    } finally {
      request.post = originalPost
    }

    assert.deepEqual(calls, [{
      url: '/agent/chat/message',
      data: { message: '深度分析一下600519', session_id: 's1', force_deep: true },
      config: undefined,
    }])
  } finally {
    await server.close()
  }
})
