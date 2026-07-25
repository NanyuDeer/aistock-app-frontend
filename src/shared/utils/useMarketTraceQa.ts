/**
 * 市场复盘问答 composable - HTTP 非流式
 *
 * 功能：
 *   - 通过 Node 代理调用 Python /api/agent/market-trace-qa/message
 *   - 会话历史保留在前端本地（不使用 chatStore）
 *   - 返回 trace 证据元数据，用于展示证据区域
 *   - 错误时添加降级 AI 消息（trace.degraded = true）
 */
import { ref, type Ref } from 'vue'
import { agentApi, type ChatMessage, type MarketTraceQaTrace } from '@/shared/api/modules/agent'

export type { MarketTraceQaTrace }

export function useMarketTraceQa() {
  const messages: Ref<ChatMessage[]> = ref([])
  const loading = ref(false)
  const sessionId = ref('')

  async function send(content: string) {
    // Add user message
    messages.value.push({
      role: 'user',
      content,
      timestamp: Date.now(),
    })

    loading.value = true

    if (!sessionId.value) {
      sessionId.value = `mtqa_${Date.now()}`
    }

    try {
      const res = await agentApi.sendMarketTraceQaMessage(content, undefined, sessionId.value)
      sessionId.value = res.session_id
      messages.value.push({
        role: 'assistant',
        content: res.content,
        trace: res.trace,
        timestamp: Date.now(),
      })
    } catch (e: unknown) {
      const errMsg = (e as Record<string, unknown>)?.errMsg || (e as Error)?.message || '请求失败'
      messages.value.push({
        role: 'assistant',
        content: `请求失败：${errMsg}`,
        trace: {
          artifact_id: '',
          sources: [],
          as_of: '',
          confidence: 'low',
          uncertainty: [],
          degraded: true,
          degraded_reason: '网络请求失败',
        },
        timestamp: Date.now(),
      })
    } finally {
      loading.value = false
    }
  }

  function clearHistory() {
    messages.value = []
    sessionId.value = ''
  }

  return { messages, loading, sessionId, send, clearHistory }
}
