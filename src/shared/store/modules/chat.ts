/**
 * AI 对话状态管理（App 专属）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { agentApi, type ChatMessage } from '@/shared/api/modules/agent'
import { storage, STORAGE_KEYS } from '@/shared/utils/storage'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>(storage.get(STORAGE_KEYS.CHAT_HISTORY) || [])
  const streaming = ref(false)
  // P5-fix（问题 14）：sessionId 从 storage 恢复（刷新后多轮上下文不丢）
  const sessionId = ref<string>(storage.get(STORAGE_KEYS.CHAT_SESSION_ID) || '')

  /**
   * P5-fix（问题 14）：设置并持久化 sessionId。
   * WS 路径首轮生成 session_id 后必须回写，否则每轮生成新 id → 后端每轮新 thread → 多轮指代失效。
   */
  function setSessionId(id: string) {
    if (!id) return
    sessionId.value = id
    storage.set(STORAGE_KEYS.CHAT_SESSION_ID, id)
  }

  function appendMessage(msg: ChatMessage) {
    messages.value.push(msg)
    // 最多保留 100 条
    if (messages.value.length > 100) {
      messages.value = messages.value.slice(-100)
    }
    storage.set(STORAGE_KEYS.CHAT_HISTORY, messages.value)
  }

  function clearHistory() {
    messages.value = []
    sessionId.value = ''
    storage.remove(STORAGE_KEYS.CHAT_HISTORY)
    storage.remove(STORAGE_KEYS.CHAT_SESSION_ID)
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
      // 注意：App 端成功响应也可能带 errMsg='request:ok'，需要过滤这种"假错误"
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

  return { messages, streaming, sessionId, setSessionId, appendMessage, clearHistory, sendMessage }
})
