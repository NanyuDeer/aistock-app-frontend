import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { storeToRefs } from 'pinia'

const getMock = vi.hoisted(() => vi.fn())
const setMock = vi.hoisted(() => vi.fn())
const removeMock = vi.hoisted(() => vi.fn())
vi.mock('@/shared/utils/storage', () => ({
  STORAGE_KEYS: {
    CHAT_HISTORY: 'chat_history',
    CHAT_SESSION_ID: 'chat_session_id',
    CHAT_SESSIONS: 'chat_sessions',
    CHAT_HISTORY_BY_SESSION: 'chat_history_by_session',
    CHAT_SESSION_USAGE: 'chat_session_usage',
  },
  storage: { get: getMock, set: setMock, remove: removeMock },
}))
vi.mock('@/shared/api/modules/agent', () => ({
  agentApi: {
    sendMessage: vi.fn(),
    listChatSessions: vi.fn(),
    upsertChatSession: vi.fn(),
    deleteChatSession: vi.fn(),
  },
}))

import { useChatStore } from './chat'
import type { ChatMessage } from '@/shared/api/modules/agent'

function assistantMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return { role: 'assistant', content: '回答', timestamp: 1, ...overrides }
}

describe('chat store 会话 token 本地累加（P11 T2）', () => {
  beforeEach(() => {
    getMock.mockImplementation((key: string) => {
      if (key === 'chat_session_usage') return null
      if (key === 'chat_session_id') return ''
      if (key === 'chat_sessions') return []
      if (key === 'chat_history_by_session') return {}
      return null
    })
    setMock.mockClear()
    removeMock.mockClear()
    setActivePinia(createPinia())
  })

  it('appendMessage 带 tokenUsage 自动按当前 sessionId 累加', () => {
    const store = useChatStore()
    store.setSessionId('s1')
    store.appendMessage(assistantMsg({ tokenUsage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } }))

    const usage = store.getCurrentSessionUsage()
    expect(usage).not.toBeNull()
    expect(usage?.total_tokens).toBe(30)
    expect(usage?.prompt_tokens).toBe(10)
  })

  it('多次累加 merge prompt/completion/total', () => {
    const store = useChatStore()
    store.setSessionId('s1')
    store.appendMessage(assistantMsg({ tokenUsage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } }))
    store.appendMessage(assistantMsg({ tokenUsage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 } }))

    const usage = store.getCurrentSessionUsage()
    expect(usage?.prompt_tokens).toBe(15)
    expect(usage?.completion_tokens).toBe(25)
    expect(usage?.total_tokens).toBe(40)
  })

  it('无 tokenUsage / 非 assistant 不累加（P9 appendMessage 自动建会话；有累计才非空）', () => {
    const store = useChatStore()
    // 仅 user 消息 + 无 tokenUsage 的 assistant 消息 → 不产生累计
    store.appendMessage({ role: 'user', content: 'q', timestamp: 1 })
    store.appendMessage(assistantMsg({}))
    expect(store.getCurrentSessionUsage()).toBeNull()

    // 带 tokenUsage 的 assistant 消息 → 累计（自动建会话后 getCurrentSessionUsage 非空）
    store.appendMessage(assistantMsg({ tokenUsage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }))
    expect(store.getCurrentSessionUsage()?.total_tokens).toBe(2)
  })

  it('不同 sessionId 的累加互不干扰，resetSessionUsage 清空', () => {
    const store = useChatStore()
    store.setSessionId('s1')
    store.appendMessage(assistantMsg({ tokenUsage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }))
    store.setSessionId('s2')
    store.appendMessage(assistantMsg({ tokenUsage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }))

    expect(store.getCurrentSessionUsage()?.total_tokens).toBe(20)

    store.resetSessionUsage()
    expect(store.getCurrentSessionUsage()).toBeNull()
  })

  it('createSession 后新会话累计天然为 0（按 session_id 分桶）', () => {
    const store = useChatStore()
    store.setSessionId('s1')
    store.appendMessage(assistantMsg({ tokenUsage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }))
    expect(store.getCurrentSessionUsage()?.total_tokens).toBe(20)
    store.createSession()
    expect(store.getCurrentSessionUsage()).toBeNull()
  })

  it('storeToRefs 暴露 messages 保持响应式（气泡消失根因回归守卫）', () => {
    // 根因（2026-08-06 定位）：store 实例上访问 computed 被 Pinia 自动解包成普通值，
    // `const displayMessages = chatStore.messages` 捕获的是陈旧数组快照，
    // appendMessage 替换 messagesBySession 后 v-for 永不更新（回复需刷新才可见）。
    // 修复：useChatStream 用 storeToRefs(chatStore) 暴露 messages（响应式 ref）。
    const store = useChatStore()
    const { messages } = storeToRefs(store)
    store.setSessionId('s1')
    store.appendMessage({ role: 'user', content: 'q', timestamp: 1 })
    expect(messages.value).toHaveLength(1)
    store.appendMessage(assistantMsg())
    expect(messages.value).toHaveLength(2)
  })
})
