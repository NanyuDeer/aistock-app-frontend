/**
 * AI 对话状态管理（App 专属）
 * P9 会话管理：消息按会话分桶（messagesBySession，本地存储）+ 会话列表（sessions，本地镜像 + server 元数据合并）。
 * 消息只存前端本地；服务端 chat_sessions 只存会话元数据（标题/时间）。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { agentApi, type ChatMessage, type ChatSessionMeta } from '@/shared/api/modules/agent'
import { storage, STORAGE_KEYS } from '@/shared/utils/storage'

/** 本地标题推导：该会话首条 user 消息 content 前 20 字，空则 '新会话' */
function deriveTitle(msgs: ChatMessage[]): string {
  const firstUser = msgs.find((m) => m.role === 'user')
  return firstUser?.content.trim().slice(0, 20) || '新会话'
}

export const useChatStore = defineStore('chat', () => {
  // P9：一次性迁移旧单会话数据（旧 CHAT_HISTORY + CHAT_SESSION_ID → messagesBySession[sessionId]）。
  // 必须在下方 ref 初始化之前执行：迁移结果写入 storage 后由 ref 初始值直接读取，保证内存态与持久态一致。
  migrateLegacyHistory()

  const sessions = ref<ChatSessionMeta[]>(storage.get(STORAGE_KEYS.CHAT_SESSIONS) || [])
  const messagesBySession = ref<Record<string, ChatMessage[]>>(storage.get(STORAGE_KEYS.CHAT_HISTORY_BY_SESSION) || {})
  // P5-fix（问题 14）：sessionId 从 storage 恢复（刷新后多轮上下文不丢）；P9 起它同时是"当前会话 id"
  const sessionId = ref<string>(storage.get(STORAGE_KEYS.CHAT_SESSION_ID) || '')
  const streaming = ref(false)

  /** 当前会话消息（对外兼容 useChatStream / modules/chat/pages/index.vue 的 messages 消费） */
  const messages = computed<ChatMessage[]>(() => messagesBySession.value[sessionId.value] || [])

  /** 当前会话是否已有 user 消息（T4 判断"首次用户消息"触发 server upsert） */
  const hasUserMessage = computed(() => messages.value.some((m) => m.role === 'user'))

  function persistSessions() {
    storage.set(STORAGE_KEYS.CHAT_SESSIONS, sessions.value)
  }

  function persistHistory() {
    storage.set(STORAGE_KEYS.CHAT_HISTORY_BY_SESSION, messagesBySession.value)
  }

  /** 旧版单会话存储 → 新分桶结构（一次性；CHAT_SESSION_ID 仍为当前会话 id 来源，保留不删） */
  function migrateLegacyHistory() {
    const legacy = storage.get<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY)
    const legacySid = storage.get<string>(STORAGE_KEYS.CHAT_SESSION_ID)
    if (legacy && legacy.length > 0 && legacySid) {
      const bySession = { ...(storage.get<Record<string, ChatMessage[]>>(STORAGE_KEYS.CHAT_HISTORY_BY_SESSION) || {}) }
      if (!bySession[legacySid]) {
        bySession[legacySid] = legacy
        storage.set(STORAGE_KEYS.CHAT_HISTORY_BY_SESSION, bySession)
        const sList = [...(storage.get<ChatSessionMeta[]>(STORAGE_KEYS.CHAT_SESSIONS) || [])]
        if (!sList.some((s) => s.session_id === legacySid)) {
          sList.unshift({ session_id: legacySid, title: deriveTitle(legacy), last_message_at: new Date().toISOString() })
          storage.set(STORAGE_KEYS.CHAT_SESSIONS, sList)
        }
      }
      // 一次性删除旧 key（迁移完成后不再读它）
      storage.remove(STORAGE_KEYS.CHAT_HISTORY)
    }
  }

  let sessionIdSeq = 0
  /** 生成唯一会话 id：`app_` + 毫秒时间戳；同一毫秒内多次创建时追加自增序号（仍为数字，满足 /^app_\d+$/ 与后端命名规则） */
  function newSessionId(): string {
    const base = Date.now()
    let id = `app_${base}`
    while (id === sessionId.value || messagesBySession.value[id]) {
      id = `app_${base}${++sessionIdSeq}`
    }
    return id
  }

  /** 确保存在当前会话载体（appendMessage 懒创建；T4 onLoad 也会显式 createSession） */
  function ensureCurrentSession(): string {
    if (!sessionId.value) {
      const newId = newSessionId()
      sessionId.value = newId
      storage.set(STORAGE_KEYS.CHAT_SESSION_ID, newId)
      messagesBySession.value = { ...messagesBySession.value, [newId]: [] }
      persistHistory()
    }
    return sessionId.value
  }

  /** 新建会话：归档当前会话（若存在且非空）→ 生成新 id → 当前视角清空 */
  function createSession() {
    const cur = sessionId.value
    if (cur && (messagesBySession.value[cur]?.length ?? 0) > 0) {
      const exists = sessions.value.some((s) => s.session_id === cur)
      if (!exists) {
        sessions.value = [...sessions.value, {
          session_id: cur,
          title: deriveTitle(messagesBySession.value[cur]),
          last_message_at: new Date().toISOString(),
        }]
        persistSessions()
      }
    }
    const newId = newSessionId()
    messagesBySession.value = { ...messagesBySession.value, [newId]: [] }
    sessionId.value = newId
    storage.set(STORAGE_KEYS.CHAT_SESSION_ID, newId)
    persistHistory()
  }

  /** 切换会话：归档当前（刷新 last_message_at）→ 切 id 并持久化 */
  function switchSession(id: string) {
    if (!id || id === sessionId.value) return
    const cur = sessionId.value
    if (cur && (messagesBySession.value[cur]?.length ?? 0) > 0) {
      sessions.value = sessions.value.map((s) =>
        s.session_id === cur ? { ...s, last_message_at: new Date().toISOString() } : s
      )
      persistSessions()
    }
    sessionId.value = id
    storage.set(STORAGE_KEYS.CHAT_SESSION_ID, id)
  }

  /**
   * 删除会话：清本地（messagesBySession + sessions）+ fire-and-forget 调 server delete。
   * 未登录时请求层 401 静默兜底（DELETE 有归属校验，无副作用）；
   * 删除的是当前会话 → 切到列表最近（sessions[0]）或新建。
   */
  function deleteSession(id: string) {
    const remaining = sessions.value.filter((s) => s.session_id !== id)
    sessions.value = remaining
    const history = { ...messagesBySession.value }
    delete history[id]
    messagesBySession.value = history
    persistSessions()
    persistHistory()

    // fire-and-forget 调 server delete；Promise.resolve 兜底（单元测试 mock 可能非 Promise 返回）
    void Promise.resolve(agentApi.deleteChatSession(id)).catch(() => {})

    if (sessionId.value === id) {
      const next = remaining[0]
      if (next) {
        sessionId.value = next.session_id
        storage.set(STORAGE_KEYS.CHAT_SESSION_ID, next.session_id)
      } else {
        createSession()
      }
    }
  }

  /** 登录时拉 server 列表合并：server 覆盖本地同名会话 title/last_message_at，保留本地仅有会话 */
  async function syncSessionsFromServer() {
    const serverList = await agentApi.listChatSessions()
    if (!Array.isArray(serverList)) return
    const seen = new Set<string>()
    const merged: ChatSessionMeta[] = serverList.map((s) => {
      seen.add(s.session_id)
      const local = sessions.value.find((x) => x.session_id === s.session_id)
      return { ...local, ...s }
    })
    for (const local of sessions.value) {
      if (!seen.has(local.session_id)) merged.push(local)
    }
    sessions.value = merged
    persistSessions()
  }

  /**
   * P5-fix（问题 14）：设置并持久化 sessionId。
   * WS 路径首轮生成 session_id 后必须回写，否则每轮生成新 id → 后端每轮新 thread → 多轮指代失效。
   * P9 补充：懒初始化该会话的消息桶，保证 switchSession 后 messages 有稳定载体。
   */
  function setSessionId(id: string) {
    if (!id) return
    sessionId.value = id
    storage.set(STORAGE_KEYS.CHAT_SESSION_ID, id)
    if (!messagesBySession.value[id]) {
      messagesBySession.value = { ...messagesBySession.value, [id]: [] }
      persistHistory()
    }
  }

  function appendMessage(msg: ChatMessage) {
    const sid = ensureCurrentSession()
    const arr = messagesBySession.value[sid] || []
    // 最多保留 100 条
    const next = [...arr, msg].slice(-100)
    messagesBySession.value = { ...messagesBySession.value, [sid]: next }
    persistHistory()

    // P9：首条 user 消息 → 本地标题取 content 前 20 字
    if (msg.role === 'user' && arr.length === 0) {
      const title = msg.content.trim().slice(0, 20) || '新会话'
      const exists = sessions.value.some((s) => s.session_id === sid)
      sessions.value = exists
        ? sessions.value.map((s) => (s.session_id === sid ? { ...s, title } : s))
        : [...sessions.value, { session_id: sid, title, last_message_at: new Date().toISOString() }]
      persistSessions()
    }
  }

  /** 清除当前会话（消息 + 本地/服务端列表条目）；无当前会话时清空列表 */
  function clearHistory() {
    const cur = sessionId.value
    if (cur) {
      deleteSession(cur)
    } else {
      sessions.value = []
      persistSessions()
    }
  }

  /**
   * 发送消息（非流式降级方案）
   * App 端推荐使用 useStreamingChat hook
   */
  async function sendMessage(content: string) {
    appendMessage({ role: 'user', content, timestamp: Date.now() })
    streaming.value = true
    try {
      const result: any = await agentApi.sendMessage(content, sessionId.value)
      if (result.session_id) setSessionId(result.session_id)
      appendMessage({
        role: 'assistant',
        content: result.content || result.message || '',
        timestamp: Date.now()
      })
    } catch (e: any) {
      // 兼容 App 端错误对象：uni-app 网络错误是 { errMsg: 'request:fail' }，没有 message 属性
      const rawErrMsg = e?.errMsg || e?.message || ''
      // request:ok 是成功响应的 errMsg，说明请求成功但响应格式异常，显示友好提示
      const errMsg = rawErrMsg === 'request:ok'
        ? '服务响应格式异常，请稍后重试'
        : (rawErrMsg || '网络错误，请稍后重试')
      appendMessage({
        role: 'assistant',
        content: `抱歉，出错了：${errMsg}`,
        timestamp: Date.now()
      })
    } finally {
      streaming.value = false
    }
  }

  return {
    messages,
    sessions,
    messagesBySession,
    hasUserMessage,
    streaming,
    sessionId,
    setSessionId,
    appendMessage,
    clearHistory,
    createSession,
    switchSession,
    deleteSession,
    syncSessionsFromServer,
    sendMessage,
  }
})
