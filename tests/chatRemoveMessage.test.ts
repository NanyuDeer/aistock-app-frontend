import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '@/shared/store/modules/chat'
import { STORAGE_KEYS } from '@/shared/utils/storage'

// agentApi 必桩（store 模块顶层 import；removeMessage 本身不调用，桩掉防真实网络）
vi.mock('@/shared/api/modules/agent', () => ({
  agentApi: {
    deleteChatSession: vi.fn().mockResolvedValue({}),
    listChatSessions: vi.fn().mockResolvedValue([]),
    upsertChatSession: vi.fn().mockResolvedValue({}),
    sendMessage: vi.fn().mockResolvedValue({}),
  },
}))

// 内存版 uni storage，宿主环境缺省
const mem = new Map<string, unknown>()
globalThis.uni = {
  getStorageSync: (k: string) => (mem.has(k) ? mem.get(k) : ''),
  setStorageSync: (k: string, v: unknown) => { mem.set(k, v) },
  removeStorageSync: (k: string) => { mem.delete(k) },
} as unknown as UniNamespace.Uni

// 各用例独立 pinia 上下文 + 空 storage，保证不串
function freshStore() {
  setActivePinia(createPinia())
  const store = useChatStore()
  store.createSession() // 生成 app_ 会话 id
  return store
}

describe('chatStore.removeMessage（批次 4 消息长按删除）', () => {
  beforeEach(() => mem.clear())

  it('删除 user 消息：从当前会话移除该条', () => {
    const store = freshStore()
    const sid = store.sessionId
    const t1 = 111, t2 = 222
    store.appendMessage({ role: 'user', content: '问题一', timestamp: t1 })
    store.appendMessage({ role: 'assistant', content: '回答', timestamp: t2 })

    store.removeMessage(t1)
    const msgs = store.messages
    expect(msgs).toHaveLength(1)
    expect(msgs[0].timestamp).toBe(t2)
    // 会话桶已持久化
    expect(mem.get(STORAGE_KEYS.CHAT_HISTORY_BY_SESSION)?.[sid]).toBeDefined()
  })

  it('删除 assistant 消息：反算扣减 tokenUsage（钳到 0）', () => {
    const store = freshStore()
    const t1 = 111, t2 = 222
    store.appendMessage({ role: 'user', content: 'q', timestamp: t1 })
    store.appendMessage({
      role: 'assistant', content: 'a', timestamp: t2,
      tokenUsage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    })
    // 再补一条用量，模拟已累计两轮
    store.appendMessage({
      role: 'user', content: 'q2', timestamp: 333,
    })
    store.appendMessage({
      role: 'assistant', content: 'a2', timestamp: 444,
      tokenUsage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    })

    store.removeMessage(t2)
    const usage = store.getCurrentSessionUsage()!
    expect(usage.total_tokens).toBe(20)          // 150 被扣掉
    expect(usage.prompt_tokens).toBe(10)
    expect(usage.completion_tokens).toBe(10)
  })

  it('删除首条 user 消息：用剩余消息重算会话标题', () => {
    const store = freshStore()
    const t1 = 111, t2 = 222
    const longQ = '这是会被删掉的旧标题来源而且这一句话明显超过二十个字'
    store.appendMessage({ role: 'user', content: longQ, timestamp: t1 })
    store.appendMessage({ role: 'assistant', content: 'a', timestamp: t2 })
    store.appendMessage({ role: 'user', content: '新问题标题', timestamp: 333 })

    const before = store.sessions.find((s) => s.session_id === store.sessionId)
    expect(before?.title).toBe(longQ.slice(0, 20))

    store.removeMessage(t1)
    const after = store.sessions.find((s) => s.session_id === store.sessionId)
    expect(after?.title).toBe('新问题标题')
  })

  it('删除带反馈的 assistant 消息：清理 feedbackRecords', () => {
    const store = freshStore()
    const t2 = 222
    store.appendMessage({ role: 'user', content: 'q', timestamp: 111 })
    store.appendMessage({ role: 'assistant', content: 'a', timestamp: t2 })
    store.setFeedback(t2, 'up')
    expect(store.feedbackRecords[t2]).toBeDefined()

    store.removeMessage(t2)
    expect(store.feedbackRecords[t2]).toBeUndefined()
  })

  it('删除不存在的 timestamp 或空会话：无副作用（不抛错）', () => {
    const store = freshStore()
    expect(() => store.removeMessage(999)).not.toThrow()
    const msgs = store.messages
    expect(msgs).toHaveLength(0)
  })
})