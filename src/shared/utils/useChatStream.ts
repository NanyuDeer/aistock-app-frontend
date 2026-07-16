/**
 * AI 对话流式输出 composable — 接入 Python 后端 WebSocket
 *
 * 功能：
 *   - 逐 token 流式显示回复
 *   - 进度步骤展示（"正在理解你的问题..." → "正在查阅分析报告..." → "正在生成回复..."）
 *   - 工具调用进度（"正在查询个股行情..."）
 *   - 自动降级到 HTTP 非流式（WS 连接失败时）
 *   - 完成后保留进度步骤（折叠显示）
 */
import { ref } from 'vue'
import { createAgentWebSocket, agentApi, type ChatMessage, type ProgressStep } from '@/shared/api/modules/agent'
import { useChatStore } from '@/shared/store/modules/chat'

export type { ProgressStep }

export function useChatStream() {
  const chatStore = useChatStore()
  const streaming = ref(false)
  const progressSteps = ref<ProgressStep[]>([])
  const streamingText = ref('')

  let socket: UniApp.SocketTask | null = null
  let wsConnected = false
  let doneReceived = false

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
    // 防止 done 后继续处理事件
    if (doneReceived) return

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
          doneReceived = true
          const finalText = data.content || streamingText.value
          // 保存进度步骤到消息（所有步骤标记为完成）
          const savedSteps = progressSteps.value.map(s => ({ ...s, status: 'done' as const }))
          progressSteps.value = []
          streamingText.value = ''
          chatStore.appendMessage({
            role: 'assistant',
            content: finalText,
            progressSteps: savedSteps.length > 0 ? savedSteps : undefined,
            timestamp: Date.now()
          })
          onDone()
        }
        break

      case 'error':
        {
          doneReceived = true
          const savedSteps = progressSteps.value.map(s => ({ ...s, status: 'done' as const }))
          progressSteps.value = []
          streamingText.value = ''
          chatStore.appendMessage({
            role: 'assistant',
            content: `抱歉，出错了：${data.content || '未知错误'}`,
            progressSteps: savedSteps.length > 0 ? savedSteps : undefined,
            timestamp: Date.now()
          })
          onDone()
        }
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
    doneReceived = false

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

        // 注册 onMessage（uni-app 会替换之前的回调）
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
        const savedSteps = progressSteps.value.map(s => ({ ...s, status: 'done' as const }))
        progressSteps.value = []
        chatStore.appendMessage({
          role: 'assistant',
          content: result.content || result.message || '',
          skillResult: result.skill_result,
          progressSteps: savedSteps,
          timestamp: Date.now()
        })
      } catch (e: any) {
        const errMsg = e?.errMsg === 'request:ok'
          ? '服务响应格式异常，请稍后重试'
          : (e?.errMsg || e?.message || '网络错误，请稍后重试')
        const savedSteps = progressSteps.value.map(s => ({ ...s, status: 'done' as const }))
        progressSteps.value = []
        chatStore.appendMessage({
          role: 'assistant',
          content: `抱歉，出错了：${errMsg}`,
          progressSteps: savedSteps,
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
