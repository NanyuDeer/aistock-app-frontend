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

  return { messages, streaming, sessionId, appendMessage, clearHistory, sendMessage }
})
