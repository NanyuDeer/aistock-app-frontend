/**
 * AI 对话状态管理（App 专属）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { agentApi, type ChatMessage } from '@/api/modules/agent'
import { storage, STORAGE_KEYS } from '@/utils/storage'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>(storage.get(STORAGE_KEYS.CHAT_HISTORY) || [])
  const streaming = ref(false)
  const sessionId = ref<string>('')

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
    storage.remove(STORAGE_KEYS.CHAT_HISTORY)
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
      if (result.session_id) sessionId.value = result.session_id
      appendMessage({
        role: 'assistant',
        content: result.content || result.message || '',
        skillResult: result.skill_result,
        timestamp: Date.now()
      })
    } catch (e: any) {
      appendMessage({
        role: 'assistant',
        content: `抱歉，出错了：${e.message}`,
        timestamp: Date.now()
      })
    } finally {
      streaming.value = false
    }
  }

  return { messages, streaming, sessionId, appendMessage, clearHistory, sendMessage }
})
