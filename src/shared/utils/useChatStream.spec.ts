import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reactive, ref } from 'vue'
import { useChatStream, _STALL_TIMEOUT_MS, _STALL_CHECK_INTERVAL_MS } from './useChatStream'
import { agentApi } from '@/shared/api/modules/agent'
import type { ChatMessage, ReasoningStep } from '@/shared/api/modules/agent'

// Mock chatStore（避免持久化 + 隔离测试）。
// 契约：useChatStream 用 storeToRefs(chatStore) 暴露 messages/sessionId —— storeToRefs 只收集
// isRef/isReactive 属性，纯对象 `{ value: [] }` 会被跳过（修复前 mock 契约脱节 → 测试里
// stream.messages/sessionId 实为 undefined）。因此 messages/sessionId 必须用真实 ref；
// 且 mock store 用 reactive 包装，使 composable 内部 `chatStore.sessionId`（send 首轮生成 id 时
// 读字符串判断）经代理自动解包成字符串。appendMessage 推入 messages.value 保持响应式。
const mockAppendMessage = vi.hoisted(() => vi.fn())
const mockSetSessionId = vi.hoisted(() => vi.fn())

vi.mock('@/shared/store/modules/chat', () => {
  const messages = ref<ChatMessage[]>([])
  const sessionId = ref('')
  return {
    useChatStore: () =>
      reactive({
        messages,
        sessionId,
        appendMessage: (msg: ChatMessage) => {
          mockAppendMessage(msg)
          messages.value.push(msg)
        },
        setSessionId: (id: string) => {
          mockSetSessionId(id)
          sessionId.value = id
        },
      }),
  }
})

vi.mock('@/shared/store/modules/user', () => ({
  useUserStore: () => ({ userInfo: { id: 1, openid: 'o_20260805' } }),
}))

// Mock WebSocket（连接即开；捕获 onMessage 回调供测试注入 WS 事件；捕获 send 参数）
// mockWsFail.fail=true 时 onOpen 不触发、onError 触发 → connect resolve(false) → send 走 HTTP 降级分支
const mockSocketCbs = vi.hoisted(() => ({
  onMessageCbs: [] as Array<(msg: any) => void>,
  onCloseCbs: [] as Array<(res?: any) => void>,
  onErrorCbs: [] as Array<(res?: any) => void>,
}))
const mockWsFail = vi.hoisted(() => ({ fail: false }))
const mockSocketSend = vi.hoisted(() => vi.fn())
vi.mock('@/shared/api/modules/agent', () => ({
  createAgentWebSocket: () => ({
    onOpen: (cb: () => void) => { if (!mockWsFail.fail) cb() },
    onClose: (cb: (res?: any) => void) => { mockSocketCbs.onCloseCbs.push(cb) },
    onError: (cb: (res?: any) => void) => {
      mockSocketCbs.onErrorCbs.push(cb)
      if (mockWsFail.fail) queueMicrotask(cb)
    },
    onMessage: (cb: (msg: any) => void) => { mockSocketCbs.onMessageCbs.push(cb) },
    send: mockSocketSend,
    close: () => {},
  }),
  agentApi: { sendMessage: vi.fn() },
}))

describe('useChatStream reasoning event', () => {
  beforeEach(() => {
    // 复用 composable 的 storeToRefs 引用重置 mock store 状态（messages/sessionId 是真实 ref）
    const stream = useChatStream() as any
    stream.messages.value = []
    stream.sessionId.value = ''
    mockAppendMessage.mockClear()
    mockSocketCbs.onMessageCbs.length = 0
    mockSocketCbs.onCloseCbs.length = 0
    mockSocketCbs.onErrorCbs.length = 0
    mockSocketSend.mockClear()
    mockSetSessionId.mockClear()
    mockWsFail.fail = false
    vi.mocked(agentApi.sendMessage).mockReset()
    // 单例化后：重置模块级 socket 状态（问题 15），避免用例间共享连接污染
    stream._testReset()
  })

  it('aggregates reasoning chunks by node and stores on DONE', () => {
    const stream = useChatStream() as any
    const onDone = vi.fn()

    // 模拟 WS 事件序列：qa_router 节点 2 个 chunk + skill_executor 节点 1 个 chunk + done
    stream._testHandleWsMessage({ type: 'reasoning', node: 'qa_router', chunk: '我先把' }, onDone)
    stream._testHandleWsMessage({ type: 'reasoning', node: 'qa_router', chunk: '问题拆解' }, onDone)
    stream._testHandleWsMessage({ type: 'reasoning', node: 'skill_executor', chunk: '正在收集证据' }, onDone)
    stream._testHandleWsMessage({ type: 'done', content: '最终回答' }, onDone)

    // 验证 chatStore.appendMessage 被调用
    expect(mockAppendMessage).toHaveBeenCalledTimes(1)
    const arg = mockAppendMessage.mock.calls[0][0]
    expect(arg.role).toBe('assistant')
    expect(arg.content).toBe('最终回答')
    // 验证 reasoningSteps 聚合正确
    expect(arg.reasoningSteps).toBeDefined()
    expect(arg.reasoningSteps).toHaveLength(2)
    expect(arg.reasoningSteps[0].node).toBe('qa_router')
    expect(arg.reasoningSteps[0].text).toBe('我先把问题拆解')
    expect(arg.reasoningSteps[0].status).toBe('done')
    expect(arg.reasoningSteps[1].node).toBe('skill_executor')
    expect(arg.reasoningSteps[1].text).toBe('正在收集证据')
    // 验证 onDone 被触发
    expect(onDone).toHaveBeenCalled()
  })

  it('marks reasoning steps as failed on error event', () => {
    const stream = useChatStream() as any
    const onDone = vi.fn()

    stream._testHandleWsMessage({ type: 'reasoning', node: 'qa_router', chunk: '思考中...' }, onDone)
    stream._testHandleWsMessage({ type: 'error', content: 'LLM 挂了' }, onDone)

    const arg = mockAppendMessage.mock.calls[0][0]
    expect(arg.content).toContain('抱歉，出错了')
    expect(arg.reasoningSteps).toBeDefined()
    expect(arg.reasoningSteps[0].status).toBe('failed')
  })

  it('registers onMessage once across sends (no duplicate reasoning accumulation)', async () => {
    const stream = useChatStream() as any

    // 第一轮发送：connect 内注册唯一 onMessage
    const send1 = stream.send('你好')
    await vi.waitFor(() => { expect(mockSocketCbs.onMessageCbs.length).toBe(1) })
    const handler = mockSocketCbs.onMessageCbs[0]
    handler({ data: JSON.stringify({ type: 'done', content: '第一轮' }) })
    await send1

    // 第二轮发送（深度分析）：不得再注册 onMessage（uni-app H5 是 push 累积，重复注册会翻倍处理事件）
    const send2 = stream.send('深度分析')
    await vi.waitFor(() => { expect(mockSocketCbs.onMessageCbs.length).toBe(1) })
    handler({ data: JSON.stringify({ type: 'reasoning', node: 'qa_router', chunk: '我' }) })
    handler({ data: JSON.stringify({ type: 'reasoning', node: 'qa_router', chunk: '理解' }) })
    handler({ data: JSON.stringify({ type: 'done', content: '第二轮' }) })
    await send2

    // 每个 chunk 只累积一次 → 无"我我理解理解"式翻倍
    expect(stream.streamingReasoning.value).toHaveLength(1)
    expect(stream.streamingReasoning.value[0].text).toBe('我理解')
  })

  it('exposes streamingReasoning reactively during streaming', () => {
    const stream = useChatStream() as any
    const onDone = vi.fn()

    stream._testHandleWsMessage({ type: 'reasoning', node: 'qa_router', chunk: '我先' }, onDone)
    stream._testHandleWsMessage({ type: 'reasoning', node: 'qa_router', chunk: '拆解' }, onDone)
    stream._testHandleWsMessage({ type: 'reasoning', node: 'skill_executor', chunk: '收集' }, onDone)

    // streamingReasoning 是响应式 ref，流式中实时可读
    expect(stream.streamingReasoning.value).toHaveLength(2)
    expect(stream.streamingReasoning.value[0].node).toBe('qa_router')
    expect(stream.streamingReasoning.value[0].text).toBe('我先拆解')
    expect(stream.streamingReasoning.value[0].status).toBe('streaming')
    expect(stream.streamingReasoning.value[1].node).toBe('skill_executor')
  })

  it('persists session_id to chatStore and reuses it across sends (问题 14)', async () => {
    const stream = useChatStream() as any

    // 第一轮：首轮生成 session_id 并写回 chatStore
    const send1 = stream.send('贵州茅台今天怎么样')
    await vi.waitFor(() => { expect(mockSocketSend).toHaveBeenCalledTimes(1) })
    const payload1 = JSON.parse(mockSocketSend.mock.calls[0][0].data)
    expect(payload1.session_id).toMatch(/^app_\d+$/)
    expect(mockSetSessionId).toHaveBeenCalledWith(payload1.session_id)

    // 完成第一轮
    mockSocketCbs.onMessageCbs[0]({ data: JSON.stringify({ type: 'done', content: '第一轮' }) })
    await send1

    // 第二轮（追问指代）：复用同一 session_id，不再生成新 id
    const send2 = stream.send('它今天的成交量呢')
    await vi.waitFor(() => { expect(mockSocketSend).toHaveBeenCalledTimes(2) })
    const payload2 = JSON.parse(mockSocketSend.mock.calls[1][0].data)
    expect(payload2.session_id).toBe(payload1.session_id)
    // 已持久化后不再重复写回
    expect(mockSetSessionId).toHaveBeenCalledTimes(1)

    mockSocketCbs.onMessageCbs[0]({ data: JSON.stringify({ type: 'done', content: '第二轮' }) })
    await send2
  })

  it('WS send body 不再携带 user_id（P0：user_id 由服务端注入）', async () => {
    const stream = useChatStream() as any

    const send1 = stream.send('你好')
    await vi.waitFor(() => { expect(mockSocketSend).toHaveBeenCalledTimes(1) })
    const payload = JSON.parse(mockSocketSend.mock.calls[0][0].data)
    // 即便 useUserStore 有 openid，客户端也不再自报 user_id
    expect(payload.user_id).toBeUndefined()
    expect(payload.message).toBe('你好')

    mockSocketCbs.onMessageCbs[0]({ data: JSON.stringify({ type: 'done', content: 'ok' }) })
    await send1
  })

  it('DONE 解析 token_usage/cards 写入 ChatMessage（WS 新字段）', () => {
    const stream = useChatStream() as any
    const onDone = vi.fn()

    stream._testHandleWsMessage({
      type: 'done',
      content: '最终回答',
      token_usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      cards: [{ card_type: 'market_snapshot', title: '大盘行情', data: { indices: [] } }],
    }, onDone)

    const arg = mockAppendMessage.mock.calls[0][0]
    expect(arg.tokenUsage).toEqual({ prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 })
    expect(arg.cards).toEqual([{ card_type: 'market_snapshot', title: '大盘行情', data: { indices: [] } }])
  })

  it('DONE 无 token_usage/cards 时字段为 undefined（HTTP 降级/旧协议兼容）', () => {
    const stream = useChatStream() as any
    stream._testHandleWsMessage({ type: 'done', content: 'ok' }, vi.fn())

    const arg = mockAppendMessage.mock.calls[0][0]
    expect(arg.tokenUsage).toBeUndefined()
    expect(arg.cards).toBeUndefined()
  })

  it('DONE 后消息写入 storeToRefs 暴露的响应式 messages（气泡消失根因的 composable 级回归守卫）', () => {
    const stream = useChatStream() as any
    const onDone = vi.fn()

    // 完整一轮 WS 消息流（reasoning 分块 + done），与既有用例同一模拟方式
    stream._testHandleWsMessage({ type: 'reasoning', node: 'qa_router', chunk: '我先' }, onDone)
    stream._testHandleWsMessage({ type: 'done', content: '最终回答' }, onDone)

    // 修复后 messages 经 storeToRefs 暴露为响应式 ref：DONE 处理完成后 assistant 消息必须实时可见。
    // （修复前 mock 是普通对象 `{ value: [] }`，storeToRefs 会跳过 → 此处 stream.messages 为 undefined）
    expect(stream.messages.value).toHaveLength(1)
    expect(stream.messages.value[0].role).toBe('assistant')
    expect(stream.messages.value[0].content).toBe('最终回答')
    expect(mockAppendMessage).toHaveBeenCalledTimes(1)
  })

  it('HTTP 降级：sendMessage 返回 token_usage 时 appendMessage 携带 tokenUsage（降级路径用量链路修复）', async () => {
    mockWsFail.fail = true // WS 连接失败 → send 走 HTTP 降级分支（当前环境实际路径）
    const stream = useChatStream() as any

    vi.mocked(agentApi.sendMessage).mockResolvedValue({
      content: 'HTTP 回复',
      session_id: 's1',
      token_usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      questions: ['追问A', '追问B'],
    } as any)

    await stream.send('你好')

    // 用户消息 + assistant 消息
    expect(mockAppendMessage).toHaveBeenCalledTimes(2)
    const arg = mockAppendMessage.mock.calls[1][0]
    expect(arg.content).toBe('HTTP 回复')
    // P10 线 2 缺口修复前：降级分支不读 result.token_usage → arg.tokenUsage 为 undefined
    expect(arg.tokenUsage).toEqual({ prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 })
    // 追问面板：HTTP 降级路径同样透出 questions（缺失 undefined 兼容）
    expect(arg.questions).toEqual(['追问A', '追问B'])
  })

  it('服务端 open 后立即 close（4401）→ 本轮 send 结算不挂起（P0）', async () => {
    const stream = useChatStream() as any

    const send1 = stream.send('你好')
    await vi.waitFor(() => { expect(mockSocketSend).toHaveBeenCalledTimes(1) })
    // 模拟桥接 upgrade 完成后立即 close(4401)（token 非法/过期）
    mockSocketCbs.onCloseCbs[0]?.({ code: 4401, reason: 'unauthorized' })

    // send 必须结算（否则该测试超时挂死）——await 能返回即证明不挂起
    await send1
    expect(stream.streaming.value).toBe(false)
    expect(mockAppendMessage).toHaveBeenCalled()
    const last = mockAppendMessage.mock.calls.at(-1)?.[0]
    expect(last.role).toBe('assistant')
    expect(last.content).toContain('连接已断开')
  })
})

describe('useChatStream resume（问题 15 断点续传）', () => {
  it('hasPendingRun：最后一条是 user 消息时返回 true', () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'user', content: '你好', timestamp: 1 })
    expect(stream.hasPendingRun()).toBe(true)
    stream.messages.value.push({ role: 'assistant', content: '回复', timestamp: 2 })
    expect(stream.hasPendingRun()).toBe(false)
  })

  it('resume：连接在线时发送 resume 控制消息（不重复 connect）', async () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'user', content: '你好', timestamp: 1 })
    // 模拟已连接：先 send 一次触发 connect（onOpen 同步触发 → wsConnected=true）
    stream.send('第一条')
    mockSocketSend.mockClear()
    const p = stream.resume()
    // resume_status running → 不结束；后续 done 结束
    const sent = mockSocketSend.mock.calls[0][0]
    const payload = JSON.parse(sent.data)
    expect(payload.type).toBe('resume')
    expect(payload.session_id).toBeTruthy()
    stream._testHandleWsMessage({ type: 'resume_status', status: 'running' }, () => {})
    stream._testHandleWsMessage({ type: 'done', content: '完整回答' }, () => {})
    await p
    expect(mockAppendMessage).toHaveBeenCalledWith(expect.objectContaining({ content: '完整回答', role: 'assistant' }))
  })

  it('resume：none 时自动重发最后一条 user 消息（不重复 append 用户消息）', async () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'user', content: '查一下大盘', timestamp: 1 })
    // 先触发一次连接
    stream.send('查一下大盘')
    const userCountBefore = stream.messages.value.length
    mockSocketSend.mockClear()
    const p = stream.resume()
    stream._testHandleWsMessage({ type: 'resume_status', status: 'none' }, () => {})
    // none 分支触发自动重发 → 重新走 WS send（不发 resume）
    await p
    // 用户消息不应重复 append
    expect(stream.messages.value.length).toBe(userCountBefore)
    // calls[0] 是 resume 控制消息；calls[1] 是 none 兜底自动重发的普通消息
    const sent = mockSocketSend.mock.calls[1][0]
    const payload = JSON.parse(sent.data)
    expect(payload.type).toBeUndefined()
    expect(payload.message).toBe('查一下大盘')
    // 收 done 正常落 assistant
    stream._testHandleWsMessage({ type: 'done', content: '回答', }, () => {})
    expect(mockAppendMessage).toHaveBeenCalledWith(expect.objectContaining({ content: '回答' }))
  })

  it('resume：无 pending 轮时直接返回 false 不发送', async () => {
    const stream = useChatStream() as any
    stream.messages.value.length = 0
    mockSocketSend.mockClear()
    const ok = await stream.resume()
    expect(ok).toBe(false)
    expect(mockSocketSend).not.toHaveBeenCalled()
  })
})

describe('useChatStream 打断/停止/重试（Phase 2 Part 2）', () => {
  beforeEach(() => {
    // 模块级状态隔离：本 describe 是 reasoning describe 的兄弟块，不继承其 beforeEach。
    // 重置单例 socket / mock store 消息数组 / mock 调用记录，避免用例间共享连接与消息污染
    // （无隔离时 cancelled 用例会因前序 stop_status 残留的「已停止生成」而空转通过）。
    const stream = useChatStream() as any
    stream.messages.value = []
    stream.sessionId.value = ''
    mockAppendMessage.mockClear()
    mockSocketCbs.onMessageCbs.length = 0
    mockSocketCbs.onCloseCbs.length = 0
    mockSocketCbs.onErrorCbs.length = 0
    mockSocketSend.mockClear()
    mockSetSessionId.mockClear()
    mockWsFail.fail = false
    vi.mocked(agentApi.sendMessage).mockReset()
    stream._testReset()
    // 预建连接：mock onOpen 同步触发 → connectOnce 内已连接，_stream 的 WS send 同步执行
    // （用例在 retry()/send() 返回后同步断言 calls[0]；若连接未就绪，await connectOnce
    //  会把发送推迟到微任务，calls[0] 为 undefined）。等效于 resume describe 遗留的连接态，
    //  但不依赖跨 describe 的用例顺序。
    stream.send('__connect__')
    mockSocketSend.mockClear()
  })

  it('stop：isStreaming 时发送 {type:"stop"} 并清流式状态', async () => {
    const stream = useChatStream() as any
    stream.send('第一条')
    mockSocketSend.mockClear()
    stream.stop()
    expect(stream.streaming.value).toBe(false)
    const sent = mockSocketSend.mock.calls[0][0]
    const payload = JSON.parse(sent.data)
    expect(payload.type).toBe('stop')
    expect(payload.session_id).toBeTruthy()
  })

  it('stop_status cancelled → streaming=false；pending 轮（末条为 user）落「已停止生成」', () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'user', content: '查一下大盘', timestamp: 1 })
    stream._testHandleWsMessage({ type: 'stop_status', status: 'cancelled' }, () => {})
    expect(stream.streaming.value).toBe(false)
    // spec §8.5：转发协程可能已断、cancelled 终态不达 → 本地兜底落消息，UI 不悬空
    expect(mockAppendMessage).toHaveBeenCalledWith(expect.objectContaining({ role: 'assistant', content: '已停止生成' }))
  })

  it('cancelled 终态 → append assistant "已停止生成" + streaming=false', () => {
    const stream = useChatStream() as any
    stream._testHandleWsMessage({ type: 'cancelled', content: '已停止生成' }, () => {})
    expect(mockAppendMessage).toHaveBeenCalledWith(expect.objectContaining({ role: 'assistant', content: '已停止生成' }))
    expect(stream.streaming.value).toBe(false)
  })

  it('cancelled 终态去重：末条已是「已停止生成」时不重复 append', () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'assistant', content: '已停止生成', timestamp: 1 })
    mockAppendMessage.mockClear()
    stream._testHandleWsMessage({ type: 'cancelled', content: '已停止生成' }, () => {})
    expect(mockAppendMessage).not.toHaveBeenCalled()
    expect(stream.streaming.value).toBe(false)
  })

  it('retry：重发最后一条 user 消息且不重复 append 用户消息', async () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'user', content: '查一下大盘', timestamp: 1 })
    stream.messages.value.push({ role: 'assistant', content: '已停止生成', timestamp: 2 })
    const userCountBefore = stream.messages.value.length
    mockSocketSend.mockClear()
    const p = stream.retry()
    // 重发走 _stream → WS send 普通消息（无 type 字段）
    const sent = mockSocketSend.mock.calls[0][0]
    const payload = JSON.parse(sent.data)
    expect(payload.type).toBeUndefined()
    expect(payload.message).toBe('查一下大盘')
    // 用户消息不重复 append
    expect(stream.messages.value.length).toBe(userCountBefore)
    stream._testHandleWsMessage({ type: 'done', content: '回答' }, () => {})
    await p
    expect(mockAppendMessage).toHaveBeenCalledWith(expect.objectContaining({ content: '回答' }))
  })

  it('retry：流式进行中（streaming=true）时拒绝（防抢占单槽 currentResolve）', async () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'user', content: '问', timestamp: 1 })
    stream.messages.value.push({ role: 'assistant', content: '已停止生成', timestamp: 2 })
    stream.streaming.value = true
    mockSocketSend.mockClear()
    const ok = await stream.retry()
    expect(ok).toBe(false)
    expect(mockSocketSend).not.toHaveBeenCalled()
  })

  it('hasStoppedRun：最后一条为 error/cancelled 终态时 true', () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'assistant', content: '抱歉，出错了：x', timestamp: 1 })
    expect(stream.hasStoppedRun()).toBe(true)
    stream.messages.value.push({ role: 'assistant', content: '已停止生成', timestamp: 2 })
    expect(stream.hasStoppedRun()).toBe(true)
    stream.messages.value.push({ role: 'assistant', content: '正常回答', timestamp: 3 })
    expect(stream.hasStoppedRun()).toBe(false)
  })

  it('stop_status 后迟发残留 text/done 不再处理（doneReceived 关闭本轮）', () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'user', content: '查一下大盘', timestamp: 1 })
    stream._testHandleWsMessage({ type: 'stop_status', status: 'cancelled' }, () => {})
    // stop_status 兜底已落「已停止生成」；清空记录后模拟后端迟发的残留事件
    mockAppendMessage.mockClear()
    stream._testHandleWsMessage({ type: 'text', content: '残留' }, () => {})
    stream._testHandleWsMessage({ type: 'done', content: '残留回答' }, () => {})
    // doneReceived 已置位 → 顶部早退，残留事件不得再追加/结算
    expect(mockAppendMessage).not.toHaveBeenCalled()
    expect(stream.streaming.value).toBe(false)
  })

  it('resume 轮连接断开：streaming 结算不卡死且保留 pending 轮（不落错误消息）', async () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'user', content: '查一下大盘', timestamp: 1 })
    mockAppendMessage.mockClear() // 清掉 beforeEach 预连 send('__connect__') 产生的用户消息
    const p = stream.resume()
    // 已连接 → resume 同步发控制消息，streaming=true（resume 轮进行中）
    expect(stream.streaming.value).toBe(true)
    stream._testHandleWsMessage({ type: 'resume_status', status: 'running' }, () => {})
    // 模拟续流中连接断开（已连接后断 → currentAbortHandler 结算 resume 轮）
    mockSocketCbs.onCloseCbs[0]?.({})
    await p
    expect(stream.streaming.value).toBe(false)
    // 不追加「连接已断开」错误消息——resume 轮断连保留 pending（末条仍是 user），
    // 回页 onShow 可再次 resume 续跑（区别于 send 轮断连的明确报错落消息）
    expect(mockAppendMessage).not.toHaveBeenCalled()
    expect(stream.messages.value.at(-1)?.role).toBe('user')
  })
})

describe('useChatStream 交互式确认（改进 13，Phase 4-2）', () => {
  beforeEach(() => {
    const stream = useChatStream() as any
    stream.messages.value = []
    stream.sessionId.value = ''
    mockAppendMessage.mockClear()
    mockSocketCbs.onMessageCbs.length = 0
    mockSocketCbs.onCloseCbs.length = 0
    mockSocketCbs.onErrorCbs.length = 0
    mockSocketSend.mockClear()
    mockSetSessionId.mockClear()
    mockWsFail.fail = false
    vi.mocked(agentApi.sendMessage).mockReset()
    stream._testReset()
    // 预建连接：mock onOpen 同步触发 → connectOnce 内已连接，后续 WS send 同步执行
    stream.send('__connect__')
    mockSocketSend.mockClear()
    mockAppendMessage.mockClear()
  })

  it('confirm_request 终态：设置 pendingConfirm、清流式状态、结算 send promise（不 append 回答、不触发 onDone）', async () => {
    const stream = useChatStream() as any
    const onDone = vi.fn()
    const p = stream.send('贵州茅台和五粮液哪个好')
    // 先流入正常流式事件（验证 confirm_request 终态会清掉这些状态）
    stream._testHandleWsMessage({ type: 'intermediate', label: '正在理解你的问题' }, onDone)
    stream._testHandleWsMessage({ type: 'reasoning', node: 'qa_router', chunk: '多候选拆解' }, onDone)
    stream._testHandleWsMessage({ type: 'text', content: '部分文本' }, onDone)
    // confirm_request 终态（替代 DONE）
    stream._testHandleWsMessage({
      type: 'confirm_request',
      request_id: 'run_123',
      question: '你想问哪个？',
      options: [
        { key: '600519', label: '贵州茅台' },
        { key: '000858', label: '五粮液' },
      ],
      context: { session_id: 'app_123' },
    }, onDone)

    // send promise 必须结算（本轮已"处理"，等待用户点选，不挂起 streaming）
    await p
    expect(stream.pendingConfirm.value).toEqual({
      request_id: 'run_123',
      question: '你想问哪个？',
      options: [
        { key: '600519', label: '贵州茅台' },
        { key: '000858', label: '五粮液' },
      ],
    })
    expect(stream.streaming.value).toBe(false)
    // 无回答可 append：仅 send 内 append 的用户消息，不含 assistant 回复
    expect(mockAppendMessage).toHaveBeenCalledTimes(1)
    expect(mockAppendMessage.mock.calls[0][0].role).toBe('user')
    // 流式状态已清空
    expect(stream.progressSteps.value).toHaveLength(0)
    expect(stream.streamingText.value).toBe('')
    expect(stream.streamingReasoning.value).toHaveLength(0)
    // 终态语义：round 仅"已处理"，未真正完成 → onDone 不触发（区别于 done/error）
    expect(onDone).not.toHaveBeenCalled()
  })

  it('confirm_request 后未点选：doneReceived 仍关闭本轮，残留 text/done 丢弃（原语义）', async () => {
    const stream = useChatStream() as any
    const onDone = vi.fn()
    const p = stream.send('贵州茅台和五粮液哪个好')
    stream._testHandleWsMessage({
      type: 'confirm_request', request_id: 'r1', question: 'q',
      options: [{ key: 'a', label: 'A' }],
    }, onDone)
    await p
    mockAppendMessage.mockClear()
    // 未点选（未调用 sendConfirmResponse）→ 阶段 2 尚未启动，doneReceived 仍置位：
    // 迟发残留事件不得追加/结算（防 streaming 卡死/重复追加）。
    // 注意与「点选后」的区别：点选后 doneReceived 会复位，阶段 2 事件流（同构 intermediate→text→done）
    // 必须被处理（见下方集成用例）——本用例仅锁定未点选时的原语义。
    stream._testHandleWsMessage({ type: 'text', content: '残留' }, onDone)
    stream._testHandleWsMessage({ type: 'done', content: '残留回答' }, onDone)
    expect(mockAppendMessage).not.toHaveBeenCalled()
    expect(stream.streaming.value).toBe(false)
  })

  it('sendConfirmResponse：发送 {type:"confirm_response", request_id, choice, session_id}、清 pendingConfirm 并 re-arm 阶段 2', () => {
    const stream = useChatStream() as any
    stream.sessionId.value = 'app_123'
    stream.pendingConfirm.value = { request_id: 'run_1', question: 'q', options: [{ key: 'a', label: 'A' }] }
    // 模拟阶段 1 流式残留（confirm_request 终态前已累积的状态）
    stream.progressSteps.value = [{ label: '旧步骤', status: 'pending', timestamp: 1 }]
    stream.streamingText.value = '阶段1残留文本'
    stream.streamingReasoning.value = [{ node: 'qa_router', text: '残留', status: 'streaming', startAt: 1 }]
    mockSocketSend.mockClear()
    const ok = stream.sendConfirmResponse('run_1', 'a')
    expect(ok).toBe(true)
    expect(mockSocketSend).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(mockSocketSend.mock.calls[0][0].data)
    expect(payload.type).toBe('confirm_response')
    expect(payload.request_id).toBe('run_1')
    expect(payload.choice).toBe('a')
    expect(payload.session_id).toBe('app_123')
    // 本轮确认已处理 → pendingConfirm 清除（页面进入 waiting 态等续跑）
    expect(stream.pendingConfirm.value).toBeNull()
    // 阶段 2 re-arm（review 修复）：doneReceived 复位 + streaming 恢复 + 清空阶段 1 流式残留。
    // confirm_request 已 finishRun() 结算 send promise → re-arm 不占单槽；
    // doneReceived 为闭包不可直接观察，由下方集成用例的行为断言验证复位效果
    expect(stream.streaming.value).toBe(true)
    expect(stream.progressSteps.value).toHaveLength(0)
    expect(stream.streamingText.value).toBe('')
    expect(stream.streamingReasoning.value).toHaveLength(0)
  })

  it('集成：confirm_request → sendConfirmResponse → 阶段 2 事件流（intermediate/text/done）→ DONE 渲染 + doneReceived 复位', async () => {
    const stream = useChatStream() as any
    const onDone = vi.fn()
    const p = stream.send('贵州茅台和五粮液哪个好')
    // 阶段 1：confirm_request 终态（替代 DONE）
    stream._testHandleWsMessage({
      type: 'confirm_request',
      request_id: 'run_1',
      question: '你想问哪个？',
      options: [
        { key: '600519', label: '贵州茅台' },
        { key: '000858', label: '五粮液' },
      ],
    }, onDone)
    await p
    mockAppendMessage.mockClear()
    mockSocketSend.mockClear()

    // 点选 → confirm_response 发送成功 → re-arm 新一轮（doneReceived=false、streaming=true）
    expect(stream.sendConfirmResponse('run_1', '600519')).toBe(true)
    expect(stream.streaming.value).toBe(true)
    expect(stream.pendingConfirm.value).toBeNull()

    // 阶段 2 fresh run：后端在同一 WS 上重跑，事件流与阶段 1 完全同构
    // （intermediate→text→done，无"新一轮"标记）。修复前 doneReceived 未复位 →
    // handleWsMessage 顶部 `if (doneReceived) return` 将这些事件全部静默丢弃 → 回答永不出现
    stream._testHandleWsMessage({ type: 'intermediate', label: '正在查阅分析报告' }, onDone)
    stream._testHandleWsMessage({ type: 'text', content: '综合来看，' }, onDone)
    stream._testHandleWsMessage({ type: 'text', content: '贵州茅台更优' }, onDone)
    stream._testHandleWsMessage({ type: 'done', content: '综合来看，贵州茅台更优' }, onDone)

    // DONE 渲染：appendMessage 被调用且内容非空（阶段 2 事件流流入 = doneReceived 已复位）
    expect(mockAppendMessage).toHaveBeenCalledTimes(1)
    const arg = mockAppendMessage.mock.calls[0][0]
    expect(arg.role).toBe('assistant')
    expect(arg.content).toBe('综合来看，贵州茅台更优')
    expect(arg.content.length).toBeGreaterThan(0)
    // 结算：流式关闭、流式残留清空、阶段 2 DONE 触发 onDone（阶段 1 confirm_request 不触发）
    expect(stream.streaming.value).toBe(false)
    expect(stream.streamingText.value).toBe('')
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('sendConfirmResponse：WS 未连接时返回 false 且不发送（等后端 60s 超时回退澄清）', () => {
    const stream = useChatStream() as any
    stream._testReset() // 断开连接（sharedSocket=null / wsConnected=false）
    mockSocketSend.mockClear()
    const ok = stream.sendConfirmResponse('run_1', 'a')
    expect(ok).toBe(false)
    expect(mockSocketSend).not.toHaveBeenCalled()
  })

  it('abandonConfirm：关框/超时放弃 → 发送 choice="none"（后端立即回退澄清）+ re-arm 接收回退事件流', async () => {
    const stream = useChatStream() as any
    const onDone = vi.fn()
    const p = stream.send('贵州茅台和五粮液哪个好')
    stream._testHandleWsMessage({
      type: 'confirm_request',
      request_id: 'run_1',
      question: '你想问哪个？',
      options: [
        { key: '600519', label: '贵州茅台' },
        { key: '000858', label: '五粮液' },
      ],
    }, onDone)
    await p
    mockAppendMessage.mockClear()
    mockSocketSend.mockClear()

    // 用户关框 → abandonConfirm：发送 {type:"confirm_response", choice:"none"}
    stream.abandonConfirm()
    expect(mockSocketSend).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(mockSocketSend.mock.calls[0][0].data)
    expect(payload.type).toBe('confirm_response')
    expect(payload.choice).toBe('none')
    expect(payload.request_id).toBe('run_1')
    // pendingConfirm 已清；放弃路径不展示流式态（区别于点选路径 streaming=true）
    expect(stream.pendingConfirm.value).toBeNull()
    expect(stream.streaming.value).toBe(false)

    // 后端 choice='none' → confirm_timeout 重跑回退既有澄清 → 事件流与阶段 1 同构。
    // 修复前（关框不 re-arm）doneReceived=true 会把回退事件静默丢弃 → 澄清永不渲染（对话悬空）。
    stream._testHandleWsMessage({ type: 'intermediate', label: '正在查阅分析报告' }, onDone)
    stream._testHandleWsMessage({ type: 'text', content: '请提供 6 位股票代码后重试。' }, onDone)
    stream._testHandleWsMessage({ type: 'done', content: '请提供 6 位股票代码后重试。' }, onDone)
    expect(mockAppendMessage).toHaveBeenCalledTimes(1)
    const arg = mockAppendMessage.mock.calls[0][0]
    expect(arg.role).toBe('assistant')
    expect(arg.content).toBe('请提供 6 位股票代码后重试。')
    expect(stream.streaming.value).toBe(false)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('abandonConfirm：WS 不可用时软 re-arm（不发送 none、doneReceived 复位、streaming 保持 false）', async () => {
    const stream = useChatStream() as any
    const onDone = vi.fn()
    const p = stream.send('贵州茅台和五粮液哪个好')
    stream._testHandleWsMessage({
      type: 'confirm_request',
      request_id: 'run_1',
      question: '你想问哪个？',
      options: [{ key: '600519', label: '贵州茅台' }],
    }, onDone)
    await p
    mockAppendMessage.mockClear()
    mockSocketSend.mockClear()

    stream._testReset() // 断开连接：发送 none 必然失败
    stream.abandonConfirm()
    expect(mockSocketSend).not.toHaveBeenCalled()
    expect(stream.pendingConfirm.value).toBeNull()
    expect(stream.streaming.value).toBe(false)

    // 软 re-arm 后，后端 60s 超时自动 confirm_timeout 重跑 → 回退澄清事件正常流入渲染
    stream._testHandleWsMessage({ type: 'text', content: '请提供 6 位股票代码后重试。' }, onDone)
    stream._testHandleWsMessage({ type: 'done', content: '请提供 6 位股票代码后重试。' }, onDone)
    expect(mockAppendMessage).toHaveBeenCalledTimes(1)
    const arg = mockAppendMessage.mock.calls[0][0]
    expect(arg.content).toBe('请提供 6 位股票代码后重试。')
  })
})

describe('useChatStream 内容流式（改进 17：content_delta/content_reset + done 前缀补尾 + stop 保留半截）', () => {
  beforeEach(() => {
    // 模块级状态隔离（与既有 describe 一致）：重置单例 socket / mock store / mock 调用
    const stream = useChatStream() as any
    stream.messages.value = []
    stream.sessionId.value = ''
    mockAppendMessage.mockClear()
    mockSocketCbs.onMessageCbs.length = 0
    mockSocketCbs.onCloseCbs.length = 0
    mockSocketCbs.onErrorCbs.length = 0
    mockSocketSend.mockClear()
    mockSetSessionId.mockClear()
    mockWsFail.fail = false
    vi.mocked(agentApi.sendMessage).mockReset()
    stream._testReset()
  })

  it('content_delta：增量累积进 streamingText（与 text 同构）', () => {
    const stream = useChatStream() as any
    stream._testHandleWsMessage({ type: 'content_delta', content: '贵州茅台' }, () => {})
    stream._testHandleWsMessage({ type: 'content_delta', content: '是白酒龙头' }, () => {})
    expect(stream.streamingText.value).toBe('贵州茅台是白酒龙头')
  })

  it('content_reset：整段覆盖既有累积（失败兜底显式替换）', () => {
    const stream = useChatStream() as any
    stream._testHandleWsMessage({ type: 'content_delta', content: '半截' }, () => {})
    stream._testHandleWsMessage({ type: 'content_reset', content: '完整终态文本' }, () => {})
    expect(stream.streamingText.value).toBe('完整终态文本')
  })

  it('done 前缀补尾：deltas 是字节前缀 → 只补尾部（防写完跳变）且不入 buildExecTree', () => {
    const stream = useChatStream() as any
    stream._testHandleWsMessage({ type: 'content_delta', content: '第一节' }, () => {})
    stream._testHandleWsMessage({ type: 'content_delta', content: '第二节' }, () => {})
    // DONE 全文 = 增量前缀链 + 尾节（字节全等断言：补尾结果 == DONE 全文）
    stream._testHandleWsMessage({ type: 'done', content: '第一节第二节第三节' }, () => {})
    expect(mockAppendMessage).toHaveBeenCalledTimes(1)
    const arg = mockAppendMessage.mock.calls[0][0]
    expect(arg.content).toBe('第一节第二节第三节')
    // content_delta 不入 currentRunEvents（toRawWsEvent 未知类型返回 null）→ 无执行节点
    expect(arg.execSteps).toEqual([])
    // 既有 done 语义：流式残留清空
    expect(stream.streamingText.value).toBe('')
  })

  it('done 前缀补尾：前缀不成立（deep/general 未走 delta 路径）→ 整体覆盖', () => {
    const stream = useChatStream() as any
    stream.streamingText.value = '残留半截'
    stream._testHandleWsMessage({ type: 'done', content: '完整回答' }, () => {})
    expect(mockAppendMessage).toHaveBeenCalledTimes(1)
    const arg = mockAppendMessage.mock.calls[0][0]
    // 必须整体覆盖，不得拼接（否则出现「残留半截完整回答」）
    expect(arg.content).toBe('完整回答')
    expect(arg.content).not.toContain('残留半截')
  })

  it('stop：不清空已流式半截（G8 裁决），仅清进度/思考链并结算', async () => {
    const stream = useChatStream() as any
    stream.send('第一条') // 触发连接（mock onOpen 同步）
    mockSocketSend.mockClear()
    stream.streamingText.value = '半截'
    stream.stop()
    expect(stream.streaming.value).toBe(false)
    // 保留半截——由 stop_status/cancelled 分支合并「已停止生成」落消息
    expect(stream.streamingText.value).toBe('半截')
    const payload = JSON.parse(mockSocketSend.mock.calls[0][0].data)
    expect(payload.type).toBe('stop')
    expect(payload.session_id).toBeTruthy()
  })

  it('stop_status 兜底：半截 + 「已停止生成」合并落消息（pending 轮末条为 user）', () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'user', content: '查一下大盘', timestamp: 1 })
    stream.streamingText.value = '贵州茅台'
    stream._testHandleWsMessage({ type: 'stop_status', status: 'cancelled' }, () => {})
    expect(stream.streaming.value).toBe(false)
    expect(mockAppendMessage).toHaveBeenCalledTimes(1)
    expect(mockAppendMessage).toHaveBeenCalledWith(expect.objectContaining({ role: 'assistant', content: '贵州茅台已停止生成' }))
  })

  it('cancelled 终态：半截 + data.content 合并落消息', () => {
    const stream = useChatStream() as any
    stream.streamingText.value = '半截'
    stream._testHandleWsMessage({ type: 'cancelled', content: '已停止生成' }, () => {})
    expect(mockAppendMessage).toHaveBeenCalledTimes(1)
    expect(mockAppendMessage.mock.calls[0][0].content).toBe('半截已停止生成')
    expect(stream.streaming.value).toBe(false)
  })

  it('stop_status → 迟达 cancelled：双分支不重复 append（doneReceived 关闭本轮）', () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'user', content: '查一下大盘', timestamp: 1 })
    stream.streamingText.value = '半截'
    stream._testHandleWsMessage({ type: 'stop_status', status: 'cancelled' }, () => {})
    expect(mockAppendMessage).toHaveBeenCalledTimes(1)
    expect(mockAppendMessage.mock.calls[0][0].content).toBe('半截已停止生成')
    mockAppendMessage.mockClear()
    // 迟到的 cancelled 终态：doneReceived 顶部早退，不得二次 append
    stream._testHandleWsMessage({ type: 'cancelled', content: '已停止生成' }, () => {})
    expect(mockAppendMessage).not.toHaveBeenCalled()
  })

  it('cancelled 去重（后缀判据修订）：末条已是「半截+已停止生成」时不重复 append', () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'assistant', content: '半截已停止生成', timestamp: 1 })
    mockAppendMessage.mockClear()
    stream._testHandleWsMessage({ type: 'cancelled', content: '已停止生成' }, () => {})
    expect(mockAppendMessage).not.toHaveBeenCalled()
    expect(stream.streaming.value).toBe(false)
  })

  it('未知事件：静默忽略不抛错（switch 无 default，无副作用）', () => {
    const stream = useChatStream() as any
    expect(() => {
      stream._testHandleWsMessage({ type: 'unknown_event_xyz', content: 'x' }, () => {})
    }).not.toThrow()
    expect(stream.streamingText.value).toBe('')
    expect(mockAppendMessage).not.toHaveBeenCalled()
  })

  it('resume 回放：content_delta 重放累积 → done 前缀补尾（回放字节前缀链）', async () => {
    const stream = useChatStream() as any
    stream.messages.value.push({ role: 'user', content: '查一下大盘', timestamp: 1 })
    stream.send('__connect__') // 预建连接（mock onOpen 同步）
    mockSocketSend.mockClear()
    const p = stream.resume()
    const sent = mockSocketSend.mock.calls[0][0]
    expect(JSON.parse(sent.data).type).toBe('resume')
    stream._testHandleWsMessage({ type: 'resume_status', status: 'running' }, () => {})
    // 后端按 state.events 回放：content_delta 增量（字节前缀）+ DONE 全文
    stream._testHandleWsMessage({ type: 'content_delta', content: '贵州茅台' }, () => {})
    stream._testHandleWsMessage({ type: 'content_delta', content: '持续上涨' }, () => {})
    stream._testHandleWsMessage({ type: 'done', content: '贵州茅台持续上涨，关注风险' }, () => {})
    await p
    expect(mockAppendMessage).toHaveBeenCalledWith(expect.objectContaining({ role: 'assistant', content: '贵州茅台持续上涨，关注风险' }))
  })
})

describe('useChatStream stall timeout（问题 20 R3：WS 发送后 idle 静默段超时兜底）', () => {
  beforeEach(() => {
    const stream = useChatStream() as any
    stream.messages.value = []
    stream.sessionId.value = ''
    mockAppendMessage.mockClear()
    mockSocketSend.mockClear()
    stream._testReset()
    // 假时钟必须先于预建连接：预建轮（__connect__）产生的 setTimeout/interval 也是假定时器，不留真定时器泄漏
    vi.useFakeTimers()
    // 预建连接（mock onOpen 同步）：vitest runner 在 beforeEach 返回值处 await → 微任务放行，
    // __connect__ 的 WS 分支已执行（sharedWsConnected=true）→ 测试体内 stream.send() 同步直达
    // WS 分支，startStallTimer 的 interval 在 advanceTimersByTime 之前已挂上（与既有 describe
    // 预建连接模式一致；假时钟下不可用 vi.waitFor，改用推进假时钟）
    stream.send('__connect__')
    mockSocketSend.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
    useChatStream()._testReset()
  })

  // 设计 spec §5.2：校准期常量断言（P95 校准意识点）——idle 阈值 30min 纯兜底（首周），
  // 检查间隔 10s。测试只允许引用导出的常量，禁止复制字面量，保证校准期改值时本块测试同步失效。
  it('校准期常量：_STALL_TIMEOUT_MS === 30min、_STALL_CHECK_INTERVAL_MS === 10s（spec §5.2）', () => {
    expect(_STALL_TIMEOUT_MS).toBe(1800000)
    expect(_STALL_CHECK_INTERVAL_MS).toBe(10000)
  })

  it('WS 发送后无任何事件超过 idle 阈值 → 落「生成超时」+ 复位 streaming + 发 stop', async () => {
    const stream = useChatStream() as any
    const p = stream.send('今日大盘') // mock onOpen 同步连接 → WS 分支
    // 推进：30min 校准阈值 + 10s 检查间隔 + 余量（单一事实来源：引用导出的常量）
    vi.advanceTimersByTime(_STALL_TIMEOUT_MS + _STALL_CHECK_INTERVAL_MS + 1000)
    await p

    expect(stream.streaming.value).toBe(false)
    const msgs = stream.messages.value
    const last = msgs[msgs.length - 1]
    expect(last.role).toBe('assistant')
    expect(last.content).toContain('生成超时')
    // 联动 stop 控制消息已发
    const sent = mockSocketSend.mock.calls.map((c: any[]) => JSON.parse(c[0].data))
    expect(sent.some((m: any) => m.type === 'stop')).toBe(true)
  })

  it('收到事件刷新 lastActivityAt，未达阈值不误触发', async () => {
    const stream = useChatStream() as any
    const p = stream.send('今日大盘')
    // 推进不足阈值，期间注入 intermediate 事件刷新活动时间
    vi.advanceTimersByTime(60_000)
    stream._testHandleWsMessage({ type: 'intermediate', label: '正在理解你的问题' }, () => {})
    vi.advanceTimersByTime(60_000)
    expect(stream.streaming.value).toBe(true) // 未超时，仍流式
    // 不落超时消息
    expect(mockAppendMessage.mock.calls.some((c: any[]) => c[0].content.includes('生成超时'))).toBe(false)
    // 清理：推 done 结束本轮，避免悬挂定时器
    stream._testHandleWsMessage({ type: 'done', content: '回答' }, () => {})
    await p
  })

  it('done 后清理定时器（推进不再有副作用）', async () => {
    const stream = useChatStream() as any
    const p = stream.send('今日大盘')
    stream._testHandleWsMessage({ type: 'done', content: '回答' }, () => {})
    await p
    expect(stream.streaming.value).toBe(false)
    // 推进超过阈值：done 已结束本轮，不得再落超时消息
    vi.advanceTimersByTime(_STALL_TIMEOUT_MS + _STALL_CHECK_INTERVAL_MS + 1000)
    expect(mockAppendMessage.mock.calls.some((c: any[]) => c[0].content.includes('生成超时'))).toBe(false)
  })
})

describe('useChatStream 追问面板（questions 缓存进消息，渲染 O(1)）', () => {
  beforeEach(() => {
    // 模块级状态隔离（与既有 describe 一致）：重置单例 socket / mock store / mock 调用
    const stream = useChatStream() as any
    stream.messages.value = []
    stream.sessionId.value = ''
    mockAppendMessage.mockClear()
    mockSocketCbs.onMessageCbs.length = 0
    mockSocketCbs.onCloseCbs.length = 0
    mockSocketCbs.onErrorCbs.length = 0
    mockSocketSend.mockClear()
    mockSetSessionId.mockClear()
    mockWsFail.fail = false
    vi.mocked(agentApi.sendMessage).mockReset()
    stream._testReset()
  })

  it('WS DONE 携带 questions 时缓存进消息', () => {
    const stream = useChatStream() as any
    stream._testHandleWsMessage({ type: 'done', content: '回答', questions: ['追问1', '追问2'] }, () => {})
    const last = stream.messages.value[stream.messages.value.length - 1]
    expect(last.questions).toEqual(['追问1', '追问2'])
  })

  it('WS DONE 无 questions 时消息 questions 为 undefined', () => {
    const stream = useChatStream() as any
    stream._testHandleWsMessage({ type: 'done', content: '回答' }, () => {})
    const last = stream.messages.value[stream.messages.value.length - 1]
    expect(last.questions).toBeUndefined()
  })
})
