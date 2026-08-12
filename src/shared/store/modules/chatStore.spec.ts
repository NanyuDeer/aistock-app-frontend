import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock 本地存储（内存 Map 模拟 uni.setStorageSync）──
const mockStorage = vi.hoisted(() => {
  const store = new Map<string, any>()
  return {
    get: vi.fn((key: string) => (store.has(key) ? store.get(key) : null)),
    set: vi.fn((key: string, value: any) => { store.set(key, value) }),
    remove: vi.fn((key: string) => { store.delete(key) }),
    _reset: () => store.clear(),
    _dump: () => new Map(store),
  }
})

vi.mock('@/shared/utils/storage', () => ({
  storage: mockStorage,
  STORAGE_KEYS: {
    TOKEN: 'token',
    USER_INFO: 'user_info',
    FAVORITES: 'favorites',
    APP_CONFIG: 'app_config',
    CHAT_HISTORY: 'chat_history',
    CHAT_SESSION_ID: 'chat_session_id',
    CHAT_SESSIONS: 'chat_sessions',
    CHAT_HISTORY_BY_SESSION: 'chat_history_by_session',
    CHAT_FEEDBACK: 'chat_feedback',
    THEME: 'theme',
  },
}))

// ── Mock agentApi（chatStore 只消费 deleteChatSession / listChatSessions / sendMessage）──
const mockAgentApi = vi.hoisted(() => ({
  listChatSessions: vi.fn(),
  upsertChatSession: vi.fn(),
  deleteChatSession: vi.fn(),
  sendMessage: vi.fn(),
}))

vi.mock('@/shared/api/modules/agent', () => ({
  agentApi: mockAgentApi,
}))

vi.mock('@/shared/store/modules/user', () => ({
  useUserStore: () => ({ isLoggedIn: () => false, userInfo: null }),
}))

import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from './chat'
import type { ChatMessage } from '@/shared/api/modules/agent'

function userMsg(content: string, timestamp = Date.now()): ChatMessage {
  return { role: 'user', content, timestamp }
}
function asstMsg(content: string, timestamp = Date.now()): ChatMessage {
  return { role: 'assistant', content, timestamp }
}

describe('chatStore 会话管理（P9）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockStorage._reset()
    mockAgentApi.listChatSessions.mockReset()
    mockAgentApi.deleteChatSession.mockReset()
    mockAgentApi.sendMessage.mockReset()
  })

  it('appendMessage 无会话时懒创建当前会话并写入 messagesBySession', () => {
    const store = useChatStore()
    expect(store.sessionId).toBe('')
    store.appendMessage(userMsg('你好'))
    expect(store.sessionId).toMatch(/^app_\d+$/)
    expect(store.messages).toHaveLength(1)
    expect(store.messages[0].content).toBe('你好')
    const saved = mockStorage._dump().get('chat_history_by_session')
    expect(saved[store.sessionId]).toHaveLength(1)
  })

  it('appendMessage 首条 user 消息更新本地标题（content 前 20 字）', () => {
    const store = useChatStore()
    store.appendMessage(userMsg('今天大盘怎么样，能看看资金流向吗，还有龙头股今天'))
    const s = store.sessions.find((x) => x.session_id === store.sessionId)
    expect(s?.title).toBe('今天大盘怎么样，能看看资金流向吗，还有龙头股今天'.slice(0, 20))
  })

  it('appendMessage 100 条上限（当前会话数组 slice(-100)）', () => {
    const store = useChatStore()
    for (let i = 0; i < 105; i++) {
      store.appendMessage(userMsg(`msg-${i}`, 1000 + i))
    }
    expect(store.messages).toHaveLength(100)
    expect(store.messages[0].content).toBe('msg-5')
    expect(store.messages[99].content).toBe('msg-104')
  })

  it('createSession 归档当前会话并生成新 id，旧消息仍在 messagesBySession', () => {
    const store = useChatStore()
    store.appendMessage(userMsg('第一轮'))
    store.appendMessage(asstMsg('第一轮回复'))
    const oldId = store.sessionId
    store.createSession()
    expect(store.sessionId).not.toBe(oldId)
    expect(store.sessionId).toMatch(/^app_\d+$/)
    // 当前视角清空，旧会话消息归档保留
    expect(store.messages).toHaveLength(0)
    expect(store.messagesBySession[oldId]).toHaveLength(2)
    // 列表新增归档条目（标题来自首条 user 消息）
    const s = store.sessions.find((x) => x.session_id === oldId)
    expect(s?.title).toBe('第一轮')
  })

  it('switchSession 载入目标会话消息', () => {
    const store = useChatStore()
    store.appendMessage(userMsg('会话 A 的消息'))
    const idA = store.sessionId
    store.createSession()
    store.appendMessage(userMsg('会话 B 的消息'))
    const idB = store.sessionId

    store.switchSession(idA)
    expect(store.sessionId).toBe(idA)
    expect(store.messages.map((m) => m.content)).toEqual(['会话 A 的消息'])

    store.switchSession(idB)
    expect(store.sessionId).toBe(idB)
    expect(store.messages.map((m) => m.content)).toEqual(['会话 B 的消息'])
  })

  it('deleteSession 清理本地并调 server delete；删除当前会话后切到最近', () => {
    const store = useChatStore()
    store.appendMessage(userMsg('会话 A'))
    const idA = store.sessionId
    store.createSession()
    store.appendMessage(userMsg('会话 B'))
    const idB = store.sessionId
    // 归档 A（createSession 已在列表补条目）

    store.deleteSession(idA)
    expect(mockAgentApi.deleteChatSession).toHaveBeenCalledWith(idA)
    expect(store.messagesBySession[idA]).toBeUndefined()
    expect(store.sessions.find((x) => x.session_id === idA)).toBeUndefined()

    // 删除当前会话 B → 切到最近（A 已删，只剩 B 被删 → 无剩余 → 新建）
    store.deleteSession(idB)
    expect(store.sessionId).toMatch(/^app_\d+$/)
    expect(store.messages).toHaveLength(0)
  })

  it('deleteSession 删除当前会话且仍有其他会话时切到最近会话', () => {
    const store = useChatStore()
    store.appendMessage(userMsg('会话 A'))
    const idA = store.sessionId
    store.createSession()
    store.appendMessage(userMsg('会话 B'))
    const idB = store.sessionId

    // 切回 A 再删 B：B 是"最近"列表首项（last_message_at 最新）
    store.switchSession(idA)
    store.deleteSession(idB)
    expect(store.sessionId).toBe(idA)
    expect(store.messages.map((m) => m.content)).toEqual(['会话 A'])
  })

  it('syncSessionsFromServer 合并：server 覆盖本地同名 title，保留本地仅有会话', async () => {
    const store = useChatStore()
    store.appendMessage(userMsg('本地会话'))
    const localId = store.sessionId
    // 预置一条本地无 server 对应、一条 server 有但标题更新的
    store.createSession()
    store.appendMessage(userMsg('本地也有 server 的会话'))
    const bothId = store.sessionId

    mockAgentApi.listChatSessions.mockResolvedValue([
      { session_id: bothId, title: 'server 更新的标题', last_message_at: '2026-08-05T02:00:00.000Z' },
      { session_id: 'server_only', title: '仅服务端', last_message_at: '2026-08-04T02:00:00.000Z' },
    ])

    await store.syncSessionsFromServer()

    const ids = store.sessions.map((s) => s.session_id)
    expect(ids).toContain(localId) // 本地仅有保留
    expect(ids).toContain('server_only') // server 仅有并入
    const merged = store.sessions.find((s) => s.session_id === bothId)
    expect(merged?.title).toBe('server 更新的标题')
    expect(merged?.last_message_at).toBe('2026-08-05T02:00:00.000Z')
  })

  it('旧数据一次性迁移：CHAT_HISTORY + CHAT_SESSION_ID → messagesBySession，删除旧 key', () => {
    const legacy = [userMsg('旧消息1'), asstMsg('旧回复1')]
    mockStorage.set('chat_history', legacy)
    mockStorage.set('chat_session_id', 'legacy_sid')
    setActivePinia(createPinia()) // 重新建 pinia 使 store 重新初始化（执行迁移）
    const store = useChatStore()

    expect(store.sessionId).toBe('legacy_sid')
    expect(store.messagesBySession['legacy_sid']).toHaveLength(2)
    expect(store.messages).toHaveLength(2)
    expect(store.sessions.find((s) => s.session_id === 'legacy_sid')?.title).toBe('旧消息1')
    expect(mockStorage._dump().has('chat_history')).toBe(false)
  })

  it('hasUserMessage 反映当前会话是否已有 user 消息', () => {
    const store = useChatStore()
    expect(store.hasUserMessage).toBe(false)
    store.appendMessage(userMsg('问题'))
    expect(store.hasUserMessage).toBe(true)
    store.createSession()
    expect(store.hasUserMessage).toBe(false)
  })
})

describe('chatStore 消息反馈（Phase 4-2 Task 3：本地赞/踩，按 message_id 索引，不落库）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockStorage._reset()
    mockAgentApi.listChatSessions.mockReset()
    mockAgentApi.deleteChatSession.mockReset()
    mockAgentApi.sendMessage.mockReset()
  })

  /** 建一条 assistant 回复（timestamp 即消息 id，与页面 isTypingFor 定位方式一致） */
  function asstWithId(id: number) {
    return asstMsg('回答内容', id)
  }

  it('setFeedback 写入消息字段 + CHAT_FEEDBACK 记录（session_id/message_id/timestamp）', () => {
    const store = useChatStore()
    store.setSessionId('s1')
    store.appendMessage(userMsg('问题', 100))
    store.appendMessage(asstWithId(101))
    store.setFeedback(101, 'up')

    // UI 读取源：消息字段（响应式，随 messagesBySession 替换更新）
    expect(store.messages[1].feedback).toBe('up')
    // 持久化：消息字段随 messagesBySession 落盘（刷新恢复）
    const savedHistory = mockStorage._dump().get('chat_history_by_session')
    expect(savedHistory['s1'][1].feedback).toBe('up')
    // 记录表：按 message_id 索引，含 session_id + 时间戳
    const rec = store.feedbackRecords[101]
    expect(rec).toEqual(expect.objectContaining({ session_id: 's1', message_id: 101, value: 'up' }))
    expect(typeof rec.timestamp).toBe('number')
    // 记录表持久化：CHAT_FEEDBACK 键落盘
    const savedRecords = mockStorage._dump().get('chat_feedback')
    expect(savedRecords[101].value).toBe('up')
    expect(savedRecords[101].session_id).toBe('s1')
  })

  it('同一值再点 → 取消（清除语义；消息字段与记录表同步清空）', () => {
    const store = useChatStore()
    store.setSessionId('s1')
    store.appendMessage(userMsg('问题', 100))
    store.appendMessage(asstWithId(101))
    store.setFeedback(101, 'up')
    store.setFeedback(101, 'up')

    expect(store.messages[1].feedback).toBeUndefined()
    expect(store.feedbackRecords[101]).toBeUndefined()
    expect(mockStorage._dump().get('chat_feedback')[101]).toBeUndefined()
  })

  it('up ↔ down 改选（同一消息可改选）', () => {
    const store = useChatStore()
    store.setSessionId('s1')
    store.appendMessage(userMsg('问题', 100))
    store.appendMessage(asstWithId(101))
    store.setFeedback(101, 'up')
    store.setFeedback(101, 'down')

    expect(store.messages[1].feedback).toBe('down')
    expect(store.feedbackRecords[101].value).toBe('down')
    expect(mockStorage._dump().get('chat_feedback')[101].value).toBe('down')
  })

  it('刷新恢复：重新初始化 store 后 feedback 仍在（消息字段 + 记录表）', () => {
    const store = useChatStore()
    store.setSessionId('s1')
    store.appendMessage(userMsg('问题', 100))
    store.appendMessage(asstWithId(101))
    store.setFeedback(101, 'down')

    // 模拟刷新：重建 pinia → store 从 storage 重新初始化（feedbackRecords 从 CHAT_FEEDBACK 恢复）
    setActivePinia(createPinia())
    const reloaded = useChatStore()
    reloaded.switchSession('s1')
    expect(reloaded.messages[1].feedback).toBe('down')
    expect(reloaded.feedbackRecords[101]?.value).toBe('down')
  })

  it('user 消息 / 不存在的 messageId → no-op（只允许 assistant 回复反馈）', () => {
    const store = useChatStore()
    store.setSessionId('s1')
    store.appendMessage(userMsg('问题', 100))
    store.setFeedback(100, 'up') // user 消息不允许
    expect(store.messages[0].feedback).toBeUndefined()
    store.setFeedback(999, 'up') // 不存在
    expect(store.feedbackRecords[999]).toBeUndefined()
    expect(mockStorage._dump().get('chat_feedback')).toBeUndefined()
  })

  it('deleteSession 同步清理该会话消息的反馈记录（与 messagesBySession 同生命周期）', () => {
    const store = useChatStore()
    store.setSessionId('s1')
    store.appendMessage(userMsg('问题', 100))
    store.appendMessage(asstWithId(101))
    store.setFeedback(101, 'up')

    store.deleteSession('s1')

    expect(store.feedbackRecords[101]).toBeUndefined()
    expect(mockStorage._dump().get('chat_feedback')[101]).toBeUndefined()
  })
})
