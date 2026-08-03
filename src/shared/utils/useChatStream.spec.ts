import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useChatStream } from './useChatStream'
import type { ReasoningStep } from '@/shared/api/modules/agent'

// Mock chatStore（避免持久化 + 隔离测试）
const mockAppendMessage = vi.hoisted(() => vi.fn())
vi.mock('@/shared/store/modules/chat', () => ({
  useChatStore: () => ({
    messages: { value: [] },
    sessionId: { value: '' },
    appendMessage: mockAppendMessage,
  }),
}))

vi.mock('@/shared/store/modules/user', () => ({
  useUserStore: () => ({ userInfo: { id: 1 } }),
}))

// Mock WebSocket（连接即开）
vi.mock('@/shared/api/modules/agent', () => ({
  createAgentWebSocket: () => ({
    onOpen: (cb: () => void) => cb(),
    onClose: () => {},
    onError: () => {},
    onMessage: () => {},
    send: () => {},
    close: () => {},
  }),
  agentApi: { sendMessage: vi.fn() },
}))

describe('useChatStream reasoning event', () => {
  beforeEach(() => {
    mockAppendMessage.mockClear()
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
})
