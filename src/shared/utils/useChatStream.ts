/**
 * AI 对话流式输出 composable — 接入 Python 后端 WebSocket
 *
 * 功能：
 *   - 逐 token 流式显示回复
 *   - 进度步骤展示（"正在理解你的问题..." → "正在查阅分析报告..." → "正在生成回复..."）
 *   - 工具调用进度（"正在查询个股行情..."）
 *   - 自动降级到 HTTP 非流式（WS 连接失败时）
 *   - 完成后保留进度步骤（折叠显示）
 *   - 模块级 socket 单例 + resume 断线续传（问题 15：连接跨页面实例存活，页面生命周期不销毁）
 */
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { createAgentWebSocket, agentApi, type ChatMessage, type ProgressStep, type ReasoningStep, type TokenUsage, type ChatCard } from '@/shared/api/modules/agent'
import { buildExecTree, toRawWsEvent, type RawWsEvent } from './buildExecTree'
import { useChatStore } from '@/shared/store/modules/chat'

export type { ProgressStep }

// ===== 模块级单例 socket（问题 15：跨页面实例存活，页面生命周期不销毁连接）=====
let sharedSocket: UniApp.SocketTask | null = null
let sharedWsConnected = false
let connectPromise: Promise<boolean> | null = null
// 单槽消息处理器：当前存活页面的 handleWsMessage（同一时刻只有一个对话页实例）
let currentHandler: ((data: any) => void) | null = null
// 单槽 abort 处理器：当前存活页面的挂起 send 结算（连接断开/出错时调用，防 streaming 卡死——
// P0-fix 在单例化后的等价物）
let currentAbortHandler: ((reason: string) => void) | null = null
// 当前发送/续跑轮的 resolve（单槽：同一时刻只有一个活动轮）
let currentResolve: (() => void) | null = null
// resume 轮进行中标记（问题 15 遗留修复：resume 不占 currentResolve 单槽，
// 断连时需单独结算 streaming——否则 abortPendingSend 因 currentResolve 为 null 直接
// return → streaming 卡 true。running 续流期置位，终态/abort/新 send 轮清位）
let resumeInFlight = false

function connectOnce(): Promise<boolean> {
  if (sharedSocket && sharedWsConnected) return Promise.resolve(true)
  if (connectPromise) return connectPromise
  connectPromise = new Promise((resolve) => {
    try {
      sharedSocket = createAgentWebSocket()

      sharedSocket.onOpen(() => {
        sharedWsConnected = true
        resolve(true)
        connectPromise = null
      })

      sharedSocket.onClose(() => {
        // P0-fix（单例版）：连接已建后断开 → 结算挂起的 currentResolve（否则 send promise
        // 永不 resolve → streaming 卡死、用户无回复）；连接未建成 → 结算 connect 为 false 走 HTTP 降级
        const wasConnected = sharedWsConnected
        sharedWsConnected = false
        sharedSocket = null
        if (connectPromise) {
          resolve(false)
          connectPromise = null
        }
        if (wasConnected) {
          currentAbortHandler?.('连接已断开，请重试')
        }
      })

      sharedSocket.onError(() => {
        if (!sharedWsConnected) {
          resolve(false)
          connectPromise = null
        }
        sharedWsConnected = false
        currentAbortHandler?.('连接失败，请重试')
      })

      // P3-fix-2：onMessage 必须单次注册（uni-app H5 是累积注册而非替换），
      // 通过 currentHandler 单槽分发到当前存活页面实例
      sharedSocket.onMessage((msg: any) => {
        let data: any
        try {
          data = JSON.parse(msg.data)
        } catch {
          return
        }
        currentHandler?.(data)
      })

      // 超时降级（HTTP 兜底）
      setTimeout(() => {
        if (!sharedWsConnected && connectPromise) {
          resolve(false)
          connectPromise = null
        }
      }, 3000)
    } catch {
      resolve(false)
      connectPromise = null
    }
  })
  return connectPromise
}

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

  // 单例化后每实例仅保留本轮 done 标记（模块级状态见文件头）
  let doneReceived = false

  function handleWsMessage(data: any, onDone?: () => void) {
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

      case 'resume_status':
        // 断线续跑回包：none → 后端无记录，自动重发最后一条 user 消息兜底
        if (data.status === 'none') {
          const last = lastUserMessage()
          if (last) {
            void _stream(last.content)
            // 测试环境（vitest）无 uni 全局，运行时探测避免 ReferenceError；生产环境 uni 恒存在
            if (typeof uni !== 'undefined') {
              uni.showToast({ title: '重新生成中', icon: 'none' })
            }
          } else {
            finishRun()
          }
        }
        // status === 'running'：无需动作，后续事件正常流入
        break

      case 'stop_status':
        // 停止回包：cancelled / not_found 均结束本轮。
        // spec §8.5 兜底：若转发协程已断、cancelled 终态不达，本地将 pending 轮
        // （末条为 user）落为「已停止生成」，UI 不悬空；随后到达的 cancelled 终态去重跳过。
        // 遗留修复：置 doneReceived 关闭本轮，防后端 stop 后迟发的残留 text/done 被追加。
        doneReceived = true
        finishRun()
        {
          const last = messages.value[messages.value.length - 1]
          if (last && last.role === 'user') {
            chatStore.appendMessage({ role: 'assistant', content: '已停止生成', timestamp: Date.now() })
          }
        }
        break

      case 'cancelled':
        {
          doneReceived = true
          progressSteps.value = []
          streamingText.value = ''
          currentRunReasoning.value = []
          const last = messages.value[messages.value.length - 1]
          // 去重：stop_status 兜底已落过「已停止生成」时不再重复 append
          if (!(last && last.role === 'assistant' && last.content === '已停止生成')) {
            chatStore.appendMessage({
              role: 'assistant',
              content: data.content || '已停止生成',
              timestamp: Date.now()
            })
          }
          finishRun()
        }
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
          finishRun()
          onDone?.()
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
          finishRun()
          onDone?.()
        }
        break
    }
  }

  /** 结算当前活动轮：释放单槽 currentResolve 并关闭流式状态（done/error/resume_status none 无兜底时调用） */
  function finishRun() {
    const r = currentResolve
    currentResolve = null
    resumeInFlight = false
    streaming.value = false
    r?.()
  }

  /**
   * P0-fix（单例版）：连接断开/出错时结算挂起的本轮 send，并追加明确的原因消息——
   * 否则 send promise 永不 resolve → streaming 卡死、用户无回复。
   * 由模块级 onClose/onError 经 currentAbortHandler 单槽调用（对应原 connect() 内 handleSendAbort）。
   *
   * 问题 15 遗留修复：resume 轮（resumeInFlight）断连时只结算 streaming、不落错误消息——
   * 保留 pending 轮（末条仍为 user），回页 onShow 可再次 resume 续跑；
   * send 轮（currentResolve）断连维持原语义（明确报错落消息，防用户无回复）。
   */
  function abortPendingSend(reason: string) {
    if (resumeInFlight) {
      resumeInFlight = false
      doneReceived = true
      streaming.value = false
      progressSteps.value = []
      streamingText.value = ''
      currentRunReasoning.value = []
      return
    }
    if (!currentResolve) return
    const r = currentResolve
    currentResolve = null
    doneReceived = true
    streaming.value = false
    progressSteps.value = []
    streamingText.value = ''
    chatStore.appendMessage({ role: 'assistant', content: reason, timestamp: Date.now() })
    r()
  }

  function lastUserMessage(): ChatMessage | null {
    const arr = messages.value
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].role === 'user') return arr[i]
    }
    return null
  }

  /** 最后一条是 user 消息 → 该轮未完成（pending），回页需 resume */
  function hasPendingRun(): boolean {
    const arr = messages.value
    if (arr.length === 0) return false
    return arr[arr.length - 1].role === 'user'
  }

  function isConnected(): boolean {
    return sharedWsConnected
  }

  /** 断线续跑：重连 + 发 resume 控制消息；none 兜底自动重发最后一条 user 消息。
   * 返回的 promise 在 resume 请求发出后即 resolve（发送即视为接管成功，
   * 不占 currentResolve 单槽 —— 否则 none 分支的 _stream 会抢占导致本 promise 永不 resolve）。
   */
  async function resume(): Promise<boolean> {
    if (!hasPendingRun()) return false
    if (!sharedWsConnected) {
      const ok = await connectOnce()
      if (!ok) return false
    }
    if (!sharedSocket || !sharedWsConnected) return false
    // 重置本轮流式预览（resume 回放重建语义，最终 DONE 整体覆盖）
    streaming.value = true
    progressSteps.value = []
    streamingText.value = ''
    doneReceived = false
    currentRunEvents.length = 0
    currentRunReasoning.value = []
    // 遗留修复：标记 resume 轮进行中（断连时由 abortPendingSend 结算 streaming，不落错误消息）
    resumeInFlight = true
    const sid = chatStore.sessionId || `app_${Date.now()}`
    if (!chatStore.sessionId) chatStore.setSessionId(sid)
    sharedSocket.send({
      data: JSON.stringify({ type: 'resume', session_id: sid })
    })
    return true
  }

  /** 生成中停止：发 stop 控制消息 + 本地立即清流式状态（UI 不悬空；
   *  终态处理由 stop_status（兜底落消息）与 cancelled（去重落消息）分支完成）。 */
  function stop(): void {
    if (!streaming.value) return
    if (sharedSocket && sharedWsConnected) {
      const sid = chatStore.sessionId || `app_${Date.now()}`
      sharedSocket.send({
        data: JSON.stringify({ type: 'stop', session_id: sid })
      })
    }
    progressSteps.value = []
    streamingText.value = ''
    currentRunReasoning.value = []
    finishRun()
  }

  /** 最后一条 assistant 为 error/cancelled 终态 → 供重试按钮显隐 */
  function hasStoppedRun(): boolean {
    const arr = messages.value
    if (arr.length === 0) return false
    const last = arr[arr.length - 1]
    return (
      last.role === 'assistant' &&
      (last.content.startsWith('抱歉，出错了') || last.content.startsWith('已停止生成'))
    )
  }

  /** 重试：重发最后一条 user 消息（复用 _stream 不重复 append 用户消息）。
   *  streaming 进行中拒绝（防抢占单槽 currentResolve，与 rerunDeep 守卫一致）。 */
  async function retry(): Promise<boolean> {
    if (streaming.value) return false
    const last = lastUserMessage()
    if (!last) return false
    await _stream(last.content)
    return true
  }

  /**
   * 发送消息（优先 WebSocket 流式，降级 HTTP 非流式）。
   * send 负责 append 用户消息；_stream 只负责传输（resume none 兜底复用 _stream 不重复 append）。
   * @param options.forceDeep - D4：强制走深度分析（Task 6 页面「深度分析」按钮接入）
   */
  async function send(content: string, options?: { forceDeep?: boolean }) {
    // 添加用户消息
    chatStore.appendMessage({ role: 'user', content, timestamp: Date.now() })
    await _stream(content, options)
  }

  async function _stream(content: string, options?: { forceDeep?: boolean }) {
    streaming.value = true
    progressSteps.value = []
    streamingText.value = ''
    doneReceived = false
    // D21：每轮重置事件收集
    currentRunEvents.length = 0
    // 每轮重置 reasoning 累积
    currentRunReasoning.value = []
    // 遗留修复：_stream 是新发送轮（占 currentResolve 结算），清掉 resume 轮标记——
    // resume_status none 兜底重发即走此路径，断连按 send 语义明确报错
    resumeInFlight = false

    // 尝试 WebSocket 流式
    if (!sharedWsConnected) {
      await connectOnce()
    }

    if (sharedWsConnected && sharedSocket) {
      // WS 流式模式
      await new Promise<void>((resolve) => {
        // P3-fix-2：onMessage 已在 connectOnce 单次注册，这里只更新当前轮的解析器
        currentResolve = () => {
          streaming.value = false
          resolve()
        }

        // P5-fix（问题 14）：WS 路径首轮生成 session_id 后必须写回 chatStore（此前不写回，
        // 每轮生成新 app_${Date.now()} → 后端 checkpointer 每轮新 thread → 多轮指代/纠错失效）
        const sid = chatStore.sessionId || `app_${Date.now()}`
        if (!chatStore.sessionId) chatStore.setSessionId(sid)
        sharedSocket!.send({
          data: JSON.stringify({
            message: content,
            session_id: sid,
            favorites: [],
            // P0：user_id 改由服务端注入（app-api 验签 JWT 后覆写），客户端不再自报——
            // resume/stop 归属校验的信任前提，与 resume/stop 消息保持一致
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
    if (sharedSocket) {
      sharedSocket.close({})
      sharedSocket = null
      sharedWsConnected = false
      connectPromise = null
    }
  }

  function register() {
    currentHandler = handleWsMessage
    currentAbortHandler = abortPendingSend
  }

  function _testReset() {
    sharedSocket = null
    sharedWsConnected = false
    connectPromise = null
    currentHandler = null
    currentAbortHandler = null
    currentResolve = null
    resumeInFlight = false
  }

  register()

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
    isConnected,
    hasPendingRun,
    resume,
    stop,
    retry,
    hasStoppedRun,
    // 测试钩子：直接暴露 handleWsMessage 供单测模拟 WS 事件序列
    _testHandleWsMessage: handleWsMessage,
    _testReset,
  }
}
