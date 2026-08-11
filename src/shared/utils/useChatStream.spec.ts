import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, ref } from 'vue'
import { useChatStream } from './useChatStream'
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
    } as any)

    await stream.send('你好')

    // 用户消息 + assistant 消息
    expect(mockAppendMessage).toHaveBeenCalledTimes(2)
    const arg = mockAppendMessage.mock.calls[1][0]
    expect(arg.content).toBe('HTTP 回复')
    // P10 线 2 缺口修复前：降级分支不读 result.token_usage → arg.tokenUsage 为 undefined
    expect(arg.tokenUsage).toEqual({ prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 })
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
