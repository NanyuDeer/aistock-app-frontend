/**
 * AI 对话状态管理（App 专属）
 * P9 会话管理：消息按会话分桶（messagesBySession，本地存储）+ 会话列表（sessions，本地镜像 + server 元数据合并）。
 * 消息只存前端本地；服务端 chat_sessions 只存会话元数据（标题/时间）。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { agentApi, type ChatMessage, type ChatSessionMeta, type TokenUsage } from '@/shared/api/modules/agent'
import { storage, STORAGE_KEYS } from '@/shared/utils/storage'

/** 本地标题推导：该会话首条 user 消息 content 前 20 字，空则 '新会话' */
function deriveTitle(msgs: ChatMessage[]): string {
  const firstUser = msgs.find((m) => m.role === 'user')
  return firstUser?.content.trim().slice(0, 20) || '新会话'
}

/** Phase 4-2 Task 3：消息赞/踩反馈记录（v1 纯前端本地、按 message_id 索引、不落库） */
export interface ChatFeedbackRecord {
  session_id: string
  message_id: number
  value: 'up' | 'down'
  timestamp: number
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

  // P11 T2：「本次会话」token 本地累加（key = session_id → 累计）。
  // P9 后 createSession 生成新 session_id → 该会话天然无累计（getCurrentSessionUsage 返回 null），
  // 无需在 createSession 内显式清空；resetSessionUsage 供全局清空（本 plan 无 UI 入口）。
  const sessionUsage = ref<Record<string, TokenUsage>>(storage.get(STORAGE_KEYS.CHAT_SESSION_USAGE) || {})

  // Phase 4-2 Task 3：消息赞/踩反馈记录表（key=message_id → 记录；与消息字段 feedback 同步写入，
  // 双写保证「按 message_id 查询」与「UI 读 msg.feedback」两个消费方向都刷新可见）。
  const feedbackRecords = ref<Record<string, ChatFeedbackRecord>>(storage.get(STORAGE_KEYS.CHAT_FEEDBACK) || {})

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
    // Phase 4-2 Task 3：先取该会话消息 id（用于后续反馈记录清理；delete 后 messagesBySession[id] 已不可读）
    const deletedMsgIds = (messagesBySession.value[id] || []).map((m) => m.timestamp)
    const remaining = sessions.value.filter((s) => s.session_id !== id)
    sessions.value = remaining
    const history = { ...messagesBySession.value }
    delete history[id]
    messagesBySession.value = history
    persistSessions()
    persistHistory()

    // 同步清理本地用量，避免删除会话后残留幽灵徽标（与 messagesBySession 同生命周期）
    if (sessionUsage.value[id]) {
      const usage = { ...sessionUsage.value }
      delete usage[id]
      sessionUsage.value = usage
      storage.set(STORAGE_KEYS.CHAT_SESSION_USAGE, sessionUsage.value)
    }

    // Phase 4-2 Task 3：同步清理该会话消息的反馈记录（与 messagesBySession 同生命周期）
    if (deletedMsgIds.length > 0) {
      const records = { ...feedbackRecords.value }
      for (const mid of deletedMsgIds) delete records[mid]
      feedbackRecords.value = records
      storage.set(STORAGE_KEYS.CHAT_FEEDBACK, records)
    }

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

    // P11 T2：assistant 消息带 tokenUsage 时按当前 sid 自动累加（WS DONE 路径；HTTP 降级无字段不累加）
    if (msg.role === 'assistant' && msg.tokenUsage && sid) {
      accumulateSessionUsage(sid, msg.tokenUsage)
    }

    // P9：首条 user 消息 → 本地标题取 content 前 20 字（保留既有逻辑）
    if (msg.role === 'user' && arr.length === 0) {
      const title = msg.content.trim().slice(0, 20) || '新会话'
      const exists = sessions.value.some((s) => s.session_id === sid)
      sessions.value = exists
        ? sessions.value.map((s) => (s.session_id === sid ? { ...s, title } : s))
        : [...sessions.value, { session_id: sid, title, last_message_at: new Date().toISOString() }]
      persistSessions()
    }
  }

  /**
   * Phase 4-2 Task 3：设置/改选/取消消息赞/踩反馈（v1 纯前端本地，不落库）。
   * messageId 即消息 timestamp（页面 isTypingFor 同款定位方式，ChatMessage 无独立 id 字段）。
   * 语义：仅 assistant 消息；同一值再点 → 取消；换值 → 改选；刷新后仍保留。
   * 双写：①消息 feedback 字段（随 messagesBySession 落盘，UI 直接读）②CHAT_FEEDBACK 记录表
   * （key=message_id，含 session_id + 时间戳，满足「按 message_id 查询」的记录结构）。
   */
  function setFeedback(messageId: number, value: 'up' | 'down') {
    const sid = sessionId.value
    if (!sid) return
    const arr = messagesBySession.value[sid]
    if (!arr) return
    const idx = arr.findIndex((m) => m.timestamp === messageId)
    if (idx === -1 || arr[idx].role !== 'assistant') return
    const nextValue = arr[idx].feedback === value ? undefined : value

    const next = arr.map((m, i) => (i === idx ? { ...m, feedback: nextValue } : m))
    messagesBySession.value = { ...messagesBySession.value, [sid]: next }
    persistHistory()

    const records = { ...feedbackRecords.value }
    if (nextValue) {
      records[messageId] = { session_id: sid, message_id: messageId, value: nextValue, timestamp: Date.now() }
    } else {
      delete records[messageId]
    }
    feedbackRecords.value = records
    storage.set(STORAGE_KEYS.CHAT_FEEDBACK, records)
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
   * P11 T2：按 sessionId 合并累加 token 用量（prompt/completion/total 分别相加）。
   * 不做后端会话维度（计划 E/线 4 另行做后端会话聚合）。
   */
  function accumulateSessionUsage(sid: string, usage: TokenUsage) {
    const prev = sessionUsage.value[sid]
    const next: TokenUsage = prev
      ? {
          prompt_tokens: prev.prompt_tokens + usage.prompt_tokens,
          completion_tokens: prev.completion_tokens + usage.completion_tokens,
          total_tokens: prev.total_tokens + usage.total_tokens,
        }
      : { ...usage }
    sessionUsage.value = { ...sessionUsage.value, [sid]: next }
    storage.set(STORAGE_KEYS.CHAT_SESSION_USAGE, sessionUsage.value)
  }

  /** 当前 sessionId 的累计用量；无会话或无数值返回 null */
  function getCurrentSessionUsage(): TokenUsage | null {
    const sid = sessionId.value
    return sid ? sessionUsage.value[sid] ?? null : null
  }

  /** 清空全部会话累加（P9 createSession 按 session_id 分桶天然清空单会话，本函数供全局清空；无 UI 入口） */
  function resetSessionUsage() {
    sessionUsage.value = {}
    storage.set(STORAGE_KEYS.CHAT_SESSION_USAGE, sessionUsage.value)
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
    sessionUsage, accumulateSessionUsage, getCurrentSessionUsage, resetSessionUsage, // P11 T2
    feedbackRecords, setFeedback, // Phase 4-2 Task 3：本地赞/踩反馈
  }
})
