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
import { storeToRefs } from 'pinia'
import { createAgentWebSocket, agentApi, type ChatMessage, type ProgressStep, type ReasoningStep, type TokenUsage, type ChatCard } from '@/shared/api/modules/agent'
import { buildExecTree, toRawWsEvent, type RawWsEvent } from './buildExecTree'
import { useChatStore } from '@/shared/store/modules/chat'
import { useUserStore } from '@/shared/store/modules/user'

export type { ProgressStep }

export function useChatStream() {
  const chatStore = useChatStore()
  // 修复气泡消失根因：Pinia store 实例上访问 computed 会被自动解包成普通值，
  // 若 index.vue 用 `const displayMessages = chatStream.messages` 捕获则得到陈旧数组快照，
  // appendMessage 替换 messagesBySession 后 v-for 永不更新（回复需刷新才可见）。
  // 用 storeToRefs 取响应式引用暴露，消费方捕获到的是 ref（模板自动解包），消息列表实时更新。
  const { messages, sessionId } = storeToRefs(chatStore)
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
          // P11 T2：DONE 附带 token_usage/cards（计划 B 线 2 新增可选字段；HTTP 降级/旧协议缺失时 undefined）
          const usage = data.token_usage as TokenUsage | null | undefined
          const cards = data.cards as ChatCard[] | null | undefined
          progressSteps.value = []
          streamingText.value = ''
          chatStore.appendMessage({
            role: 'assistant',
            content: finalText,
            // D19：deep 升级引用随 DONE 下发（light/闸门为 null，前端兼容）
            lastDeepReport: data.last_deep_report ?? undefined,
            cards: cards ?? undefined,
            tokenUsage: usage ?? undefined,
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
        // P5-fix（问题 14）：WS 路径首轮生成 session_id 后必须写回 chatStore（此前不写回，
        // 每轮生成新 app_${Date.now()} → 后端 checkpointer 每轮新 thread → 多轮指代/纠错失效）
        const sid = chatStore.sessionId || `app_${Date.now()}`
        if (!chatStore.sessionId) chatStore.setSessionId(sid)
        socket!.send({
          data: JSON.stringify({
            message: content,
            session_id: sid,
            favorites: [],
            // P11 T1：计费身份契约 user_id == openid（P2 遗留 userInfo.id 不可靠/为 "0"；未登录省略）
            user_id: userInfo?.openid ? String(userInfo.openid) : undefined,
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
        if (result.session_id) chatStore.setSessionId(result.session_id)
        const savedSteps = progressSteps.value.map(s => ({ ...s, status: 'done' as const }))
        progressSteps.value = []
        chatStore.appendMessage({
          role: 'assistant',
          content: result.content || result.message || '',
          // P10 线 2 缺口修复：HTTP 降级路径同样透出 token_usage（非流式接口已补返回；缺失 undefined 兼容）
          tokenUsage: (result.token_usage as TokenUsage | undefined) ?? undefined,
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
    // 透传 chatStore（storeToRefs 响应式引用；index.vue 捕获后消息列表实时更新）
    messages,
    sessionId,
    // 测试钩子：直接暴露 handleWsMessage 供单测模拟 WS 事件序列
    _testHandleWsMessage: handleWsMessage,
  }
}
