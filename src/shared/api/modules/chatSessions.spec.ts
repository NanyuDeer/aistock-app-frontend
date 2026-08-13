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
    // pinia 需与测试运行环境隔离，避免 Node ESM 与 vite resolver 双实例导致
    // getActivePinia() 找不到 active pinia（agent.ts 依赖 useUserStore）
    ssr: { noExternal: ['pinia'] },
  })
}

test('listChatSessions 走 GET /chat/sessions 并返回列表', async () => {
  const server = await makeServer()
  try {
    const piniaModule = await server.ssrLoadModule('pinia')
    piniaModule.setActivePinia(piniaModule.createPinia())
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const request = requestModule.default
    const originalGet = request.get
    const calls: string[] = []
    request.get = ((url: string) => {
      calls.push(url)
      return Promise.resolve([{ session_id: 's1', title: 't1', last_message_at: '2026-08-05T02:00:00.000Z' }])
    }) as typeof request.get
    try {
      const list = await agentModule.agentApi.listChatSessions()
      assert.deepEqual(list, [{ session_id: 's1', title: 't1', last_message_at: '2026-08-05T02:00:00.000Z' }])
    } finally {
      request.get = originalGet
    }
    assert.deepEqual(calls, ['/chat/sessions'])
  } finally {
    await server.close()
  }
})

test('upsertChatSession 走 POST /chat/sessions 带 session_id/question', async () => {
  const server = await makeServer()
  try {
    const piniaModule = await server.ssrLoadModule('pinia')
    piniaModule.setActivePinia(piniaModule.createPinia())
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const request = requestModule.default
    const originalPost = request.post
    const calls: Array<{ url: string; data: unknown }> = []
    request.post = ((url: string, data?: unknown) => {
      calls.push({ url, data })
      return Promise.resolve({})
    }) as typeof request.post
    try {
      await agentModule.agentApi.upsertChatSession('app_123', '今天大盘怎么样')
    } finally {
      request.post = originalPost
    }
    assert.deepEqual(calls, [{ url: '/chat/sessions', data: { session_id: 'app_123', question: '今天大盘怎么样' } }])
  } finally {
    await server.close()
  }
})

test('upsertChatSession 不带 question 时 body 仅 session_id', async () => {
  const server = await makeServer()
  try {
    const piniaModule = await server.ssrLoadModule('pinia')
    piniaModule.setActivePinia(piniaModule.createPinia())
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const request = requestModule.default
    const originalPost = request.post
    const calls: Array<{ url: string; data: unknown }> = []
    request.post = ((url: string, data?: unknown) => {
      calls.push({ url, data })
      return Promise.resolve({})
    }) as typeof request.post
    try {
      await agentModule.agentApi.upsertChatSession('app_123')
    } finally {
      request.post = originalPost
    }
    assert.deepEqual(calls, [{ url: '/chat/sessions', data: { session_id: 'app_123', question: undefined } }])
  } finally {
    await server.close()
  }
})

test('deleteChatSession 走 DELETE /chat/sessions/:id', async () => {
  const server = await makeServer()
  try {
    const piniaModule = await server.ssrLoadModule('pinia')
    piniaModule.setActivePinia(piniaModule.createPinia())
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const request = requestModule.default
    const originalDelete = request.delete
    const calls: string[] = []
    request.delete = ((url: string) => {
      calls.push(url)
      return Promise.resolve({})
    }) as typeof request.delete
    try {
      await agentModule.agentApi.deleteChatSession('app_123')
    } finally {
      request.delete = originalDelete
    }
    assert.deepEqual(calls, ['/chat/sessions/app_123'])
  } finally {
    await server.close()
  }
})

test('upsertChatSession 失败静默（fire-and-forget 不抛）', async () => {
  const server = await makeServer()
  try {
    const piniaModule = await server.ssrLoadModule('pinia')
    piniaModule.setActivePinia(piniaModule.createPinia())
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const request = requestModule.default
    const originalPost = request.post
    request.post = (() => Promise.reject(new Error('network down'))) as typeof request.post
    try {
      // 不应 reject（内部 catch 静默）
      await agentModule.agentApi.upsertChatSession('app_123', 'q')
    } finally {
      request.post = originalPost
    }
  } finally {
    await server.close()
  }
})

test('listChatSessions 失败返回空数组（不抛）', async () => {
  const server = await makeServer()
  try {
    const piniaModule = await server.ssrLoadModule('pinia')
    piniaModule.setActivePinia(piniaModule.createPinia())
    const requestModule = await server.ssrLoadModule('/src/shared/api/request.ts')
    const agentModule = await server.ssrLoadModule('/src/shared/api/modules/agent.ts')
    const request = requestModule.default
    const originalGet = request.get
    request.get = (() => Promise.reject(new Error('401'))) as typeof request.get
    try {
      const list = await agentModule.agentApi.listChatSessions()
      assert.deepEqual(list, [])
    } finally {
      request.get = originalGet
    }
  } finally {
    await server.close()
  }
})
