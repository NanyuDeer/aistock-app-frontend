/**
 * AI 对话流式输出 composable — 接入 Python 后端 WebSocket
 *
 * 功能：
 *   - 逐 token 流式显示回复
 *   - 进度步骤展示（"正在理解你的问题..." → "正在查阅分析报告..." → "正在生成回复..."）
 *   - 工具调用进度（"正在查询个股行情..."）
 *   - 自动降级到 HTTP 非流式（WS 连接失败时）
 */
import { ref } from 'vue'
import { createAgentWebSocket, agentApi, type ChatMessage } from '@/shared/api/modules/agent'
import { useChatStore } from '@/shared/store/modules/chat'

export interface ProgressStep {
  label: string
  status: 'pending' | 'done'
  timestamp: number
}

export function useChatStream() {
  const chatStore = useChatStore()
  const streaming = ref(false)
  const progressSteps = ref<ProgressStep[]>([])
  const streamingText = ref('')

  let socket: UniApp.SocketTask | null = null
  let wsConnected = false

  function connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        socket = createAgentWebSocket()

        socket.onOpen(() => {
          wsConnected = true
          resolve(true)
        })

        socket.onClose(() => {
          wsConnected = false
          socket = null
        })

        socket.onError(() => {
          if (!wsConnected) {
            resolve(false)
          }
          wsConnected = false
        })

        // 超时降级
        setTimeout(() => {
          if (!wsConnected) resolve(false)
        }, 3000)
      } catch {
        resolve(false)
      }
    })
  }

  function handleWsMessage(data: any, onDone: () => void) {
    const type = data.type

    switch (type) {
      case 'intermediate':
        progressSteps.value = [
          ...progressSteps.value.filter(s => s.status === 'done'),
          { label: data.label || '处理中...', status: 'pending', timestamp: Date.now() }
        ]
        break

      case 'tool_start':
        progressSteps.value = [
          ...progressSteps.value.filter(s => s.status === 'done'),
          { label: data.label || '调用工具中...', status: 'pending', timestamp: Date.now() }
        ]
        break

      case 'tool_end':
        {
          const steps = [...progressSteps.value]
          const last = steps[steps.length - 1]
          if (last && last.status === 'pending') {
            last.status = 'done'
            progressSteps.value = steps
          }
        }
        break

      case 'llm_start':
        // 标记所有进度步骤为已完成
        progressSteps.value = progressSteps.value.map(s => ({ ...s, status: 'done' as const }))
        break

      case 'text':
        streamingText.value += data.content || ''
        break

      case 'done':
        {
          const finalText = data.content || streamingText.value
          progressSteps.value = []
          streamingText.value = ''
          chatStore.appendMessage({
            role: 'assistant',
            content: finalText,
            timestamp: Date.now()
          })
          onDone()
        }
        break

      case 'error':
        progressSteps.value = []
        streamingText.value = ''
        chatStore.appendMessage({
          role: 'assistant',
          content: `抱歉，出错了：${data.content || '未知错误'}`,
          timestamp: Date.now()
        })
        onDone()
        break
    }
  }

  /**
   * 发送消息（优先 WebSocket 流式，降级 HTTP 非流式）
   */
  async function send(content: string) {
    // 添加用户消息
    chatStore.appendMessage({ role: 'user', content, timestamp: Date.now() })
    streaming.value = true
    progressSteps.value = []
    streamingText.value = ''

    // 尝试 WebSocket 流式
    if (!wsConnected) {
      await connect()
    }

    if (wsConnected && socket) {
      // WS 流式模式
      await new Promise<void>((resolve) => {
        const onDone = () => {
          streaming.value = false
          resolve()
        }

        socket!.onMessage((msg: any) => {
          try {
            const data = JSON.parse(msg.data)
            handleWsMessage(data, onDone)
          } catch { /* JSON 解析失败忽略 */ }
        })

        socket!.send({
          data: JSON.stringify({
            message: content,
            session_id: chatStore.sessionId || `app_${Date.now()}`,
            favorites: []
          })
        })
      })
    } else {
      // 降级 HTTP 非流式（带简单进度提示）
      progressSteps.value = [
        { label: '正在思考...', status: 'pending', timestamp: Date.now() }
      ]
      try {
        const result: any = await agentApi.sendMessage(content, chatStore.sessionId)
        if (result.session_id) chatStore.sessionId = result.session_id
        progressSteps.value = []
        chatStore.appendMessage({
          role: 'assistant',
          content: result.content || result.message || '',
          skillResult: result.skill_result,
          timestamp: Date.now()
        })
      } catch (e: any) {
        const errMsg = e?.errMsg === 'request:ok'
          ? '服务响应格式异常，请稍后重试'
          : (e?.errMsg || e?.message || '网络错误，请稍后重试')
        progressSteps.value = []
        chatStore.appendMessage({
          role: 'assistant',
          content: `抱歉，出错了：${errMsg}`,
          timestamp: Date.now()
        })
      } finally {
        streaming.value = false
      }
    }
  }

  function disconnect() {
    if (socket) {
      socket.close({})
      socket = null
      wsConnected = false
    }
  }

  return {
    streaming,
    progressSteps,
    streamingText,
    send,
    disconnect,
    // 透传 chatStore
    messages: chatStore.messages,
    sessionId: chatStore.sessionId
  }
}
