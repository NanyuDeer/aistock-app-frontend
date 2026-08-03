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
import { createAgentWebSocket, agentApi, type ChatMessage, type ProgressStep, type ReasoningStep } from '@/shared/api/modules/agent'
import { buildExecTree, toRawWsEvent, type RawWsEvent } from './buildExecTree'
import { useChatStore } from '@/shared/store/modules/chat'
import { useUserStore } from '@/shared/store/modules/user'

export type { ProgressStep }

export function useChatStream() {
  const chatStore = useChatStore()
  const streaming = ref(false)
  const progressSteps = ref<ProgressStep[]>([])
  const streamingText = ref('')
  // D21：本轮原始事件序列（每轮 send 重置；DONE/error 时重组为 execSteps）
  const currentRunEvents: RawWsEvent[] = []
  // 本轮 reasoning 步骤累积器（每轮 send 重置；DONE/error 时存入 message）
  // P3-fix-2 T2：改为 ref 并整体替换，保证流式过程中 ReasoningCard 实时重渲染
  const currentRunReasoning = ref<ReasoningStep[]>([])

  let socket: UniApp.SocketTask | null = null
  let wsConnected = false
  let doneReceived = false
  // P3-fix-2：当前轮 send 的 promise 解析器。onMessage 只在 connect 注册一次
  // （uni-app H5 的 onMessage 是 push 累积而非替换，若在 send 内重复注册，
  //  第 2 条消息起每个 WS 事件会被处理 N 遍 → reasoning 文本逐字翻倍）。
  let resolveSend: (() => void) | null = null

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

        // 单次注册 WS 消息处理（每次 send 不再重复注册）
        socket.onMessage((msg: any) => {
          try {
            const data = JSON.parse(msg.data)
            handleWsMessage(data, () => {
              const r = resolveSend
              resolveSend = null
              r?.()
            })
          } catch { /* JSON 解析失败忽略 */ }
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

    // D21：收集原始事件（含前端时间戳）；done/error 由 DONE/error 分支作结束触发
    const raw = toRawWsEvent(data, Date.now())
    if (raw) currentRunEvents.push(raw)

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

      case 'reasoning':
        {
          const node = data.node as string
          const chunk = String(data.chunk || '')
          if (!node || !chunk) break
          const idx = currentRunReasoning.value.findIndex(s => s.node === node)
          if (idx === -1) {
            currentRunReasoning.value = [
              ...currentRunReasoning.value,
              { node, text: chunk, status: 'streaming', startAt: Date.now() }
            ]
          } else {
            const steps = [...currentRunReasoning.value]
            steps[idx] = { ...steps[idx], text: steps[idx].text + chunk }
            currentRunReasoning.value = steps
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
          // 标记 reasoning 步骤完成
          for (const step of currentRunReasoning.value) {
            step.status = 'done'
            step.endAt = Date.now()
          }
          const reasoningSteps = currentRunReasoning.value.length > 0 ? [...currentRunReasoning.value] : undefined
          // D21：事件流 → 执行细节层级树（纯前端重组）
          const execSteps = buildExecTree(currentRunEvents, Date.now())
          progressSteps.value = []
          streamingText.value = ''
          chatStore.appendMessage({
            role: 'assistant',
            content: finalText,
            advisorTrace: data.advisor_trace,
            // D19：deep 升级引用随 DONE 下发（light/闸门为 null，前端兼容）
            lastDeepReport: data.last_deep_report ?? undefined,
            execSteps,
            reasoningSteps,
            timestamp: Date.now()
          })
          onDone()
        }
        break

      case 'error':
        {
          doneReceived = true
          // 标记 reasoning 步骤失败
          for (const step of currentRunReasoning.value) {
            step.status = 'failed'
            step.endAt = Date.now()
          }
          const reasoningSteps = currentRunReasoning.value.length > 0 ? [...currentRunReasoning.value] : undefined
          // D21：error 同样重组（未配对工具标 failed 语义由 buildExecTree 保证）
          const execSteps = buildExecTree(currentRunEvents, Date.now())
          progressSteps.value = []
          streamingText.value = ''
          chatStore.appendMessage({
            role: 'assistant',
            content: `抱歉，出错了：${data.content || '未知错误'}`,
            execSteps,
            reasoningSteps,
            timestamp: Date.now()
          })
          onDone()
        }
        break
    }
  }

  /**
   * 发送消息（优先 WebSocket 流式，降级 HTTP 非流式）
   * @param options.forceDeep - D4：强制走深度分析（Task 6 页面「深度分析」按钮接入）
   */
  async function send(content: string, options?: { forceDeep?: boolean }) {
    // 添加用户消息
    chatStore.appendMessage({ role: 'user', content, timestamp: Date.now() })
    streaming.value = true
    progressSteps.value = []
    streamingText.value = ''
    doneReceived = false
    // D21：每轮重置事件收集
    currentRunEvents.length = 0
    // 每轮重置 reasoning 累积
    currentRunReasoning.value = []

    // 尝试 WebSocket 流式
    if (!wsConnected) {
      await connect()
    }

    if (wsConnected && socket) {
      // WS 流式模式
      await new Promise<void>((resolve) => {
        // P3-fix-2：onMessage 已在 connect 单次注册，这里只更新当前轮的解析器
        resolveSend = () => {
          streaming.value = false
          resolve()
        }

        const userInfo = useUserStore().userInfo
        socket!.send({
          data: JSON.stringify({
            message: content,
            session_id: chatStore.sessionId || `app_${Date.now()}`,
            favorites: [],
            // D11：透传登录用户身份（chat_analysis 落库隔离用）；未登录省略
            user_id: userInfo?.id != null ? String(userInfo.id) : undefined,
            // D4：force_deep 前端「深度分析」按钮（Task 6 页面接入）
            force_deep: options?.forceDeep === true
          })
        })
      })
    } else {
      // 降级 HTTP 非流式（带简单进度提示）
      progressSteps.value = [
        { label: '正在思考...', status: 'pending', timestamp: Date.now() }
      ]
      try {
        const result: any = await agentApi.sendMessage(content, chatStore.sessionId, options)
        if (result.session_id) chatStore.sessionId = result.session_id
        const savedSteps = progressSteps.value.map(s => ({ ...s, status: 'done' as const }))
        progressSteps.value = []
        chatStore.appendMessage({
          role: 'assistant',
          content: result.content || result.message || '',
          skillResult: result.skill_result,
          advisorTrace: result.advisor_trace,
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
    // P3-fix-2 T2：流式过程中实时思考链（供模板渲染 ReasoningCard dot 动画）
    streamingReasoning: currentRunReasoning,
    send,
    disconnect,
    // 透传 chatStore
    messages: chatStore.messages,
    sessionId: chatStore.sessionId,
    // 测试钩子：直接暴露 handleWsMessage 供单测模拟 WS 事件序列
    _testHandleWsMessage: handleWsMessage,
  }
}
