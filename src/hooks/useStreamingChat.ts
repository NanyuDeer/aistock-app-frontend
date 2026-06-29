/**
 * 流式对话 Hook（App 端推荐）
 * 使用 WebSocket 实现流式输出
 */
import { ref, onUnmounted } from 'vue'
import { createWebSocket } from '@/api/modules/agent'
import { useChatStore } from '@/store/modules/chat'
import type { ChatMessage, SkillResult } from '@/api/modules/agent'

export function useStreamingChat() {
  const chatStore = useChatStore()
  const ws = ref<UniApp.SocketTask | null>(null)

  function connect() {
    ws.value = createWebSocket()
    ws.value.onOpen(() => console.log('[WS] connected'))
    ws.value.onMessage((res) => {
      try {
        const chunk = JSON.parse(res.data as string)
        handleChunk(chunk)
      } catch (e) {
        console.error('[WS] parse error:', e)
      }
    })
    ws.value.onError((err) => console.error('[WS] error:', err))
    ws.value.onClose(() => console.log('[WS] closed'))
  }

  function handleChunk(chunk: any) {
    switch (chunk.type) {
      case 'text':
        // 流式文本片段
        chatStore.appendMessage({
          role: 'assistant',
          content: chunk.content,
          timestamp: Date.now()
        })
        break
      case 'skill_result':
        // Skill 返回的结构化数据
        chatStore.appendMessage({
          role: 'assistant',
          content: chunk.narrative || '',
          skillResult: chunk.result as SkillResult,
          timestamp: Date.now()
        })
        break
      case 'done':
        chatStore.streaming = false
        break
    }
  }

  function send(content: string) {
    chatStore.appendMessage({ role: 'user', content, timestamp: Date.now() })
    chatStore.streaming = true

    if (ws.value && ws.value.readyState === 1) {
      ws.value.send({ data: JSON.stringify({ type: 'chat', message: content }) })
    } else {
      // WebSocket 未连接，降级为 HTTP
      chatStore.sendMessage(content)
    }
  }

  function disconnect() {
    ws.value?.close({})
    ws.value = null
  }

  onUnmounted(() => disconnect())

  return { connect, send, disconnect }
}
