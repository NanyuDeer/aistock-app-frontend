import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, ref } from 'vue'
import { useChatStream } from './useChatStream'
import { agentApi } from '@/shared/api/modules/agent'
import type { ChatMessage } from '@/shared/api/modules/agent'

// Mock 基建参照既有 useChatStream.spec.ts：
// - store 用真实 ref + reactive 包装（storeToRefs 只收集 isRef/isReactive 属性）
// - mockWsFail.fail=true → onError 触发 → connect resolve(false) → send 走 HTTP 降级分支
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

const mockWsFail = vi.hoisted(() => ({ fail: false }))
vi.mock('@/shared/api/modules/agent', () => ({
  createAgentWebSocket: () => ({
    onOpen: (cb: () => void) => { if (!mockWsFail.fail) cb() },
    onClose: vi.fn(),
    onError: (cb: () => void) => {
      if (mockWsFail.fail) queueMicrotask(cb)
    },
    onMessage: vi.fn(),
    send: vi.fn(),
    close: () => {},
  }),
  agentApi: { sendMessage: vi.fn() },
}))

describe('useChatStream HTTP 降级分支（5A，2026-08-17）', () => {
  beforeEach(() => {
    const stream = useChatStream() as any
    stream.messages.value = []
    stream.sessionId.value = ''
    mockAppendMessage.mockClear()
    mockSetSessionId.mockClear()
    vi.mocked(agentApi.sendMessage).mockReset()
    mockWsFail.fail = true // 强制 WS 连接失败 → HTTP 降级
    stream._testReset()
  })

  it('HTTP 降级：sendMessage 返回 last_deep_report/cards 时 appendMessage 携带（5A）', async () => {
    const deepRef = {
      report_id: 'rep_1',
      worker: 'stock',
      question: 'q',
      summary: 's',
      symbols: ['600519'],
      tag_codes: [],
      created_at: '2026-08-17T10:00:00Z',
    }
    const cards = [{ card_type: 'deep', title: '深度分析报告', data: { ...deepRef } }]
    vi.mocked(agentApi.sendMessage).mockResolvedValue({
      content: 'HTTP 深度回答',
      session_id: 's1',
      last_deep_report: deepRef,
      cards,
    } as any)

    const stream = useChatStream() as any
    await stream.send('深度分析茅台')

    // 用户消息 + assistant 消息
    expect(mockAppendMessage).toHaveBeenCalledTimes(2)
    const arg = mockAppendMessage.mock.calls[1][0]
    expect(arg.content).toBe('HTTP 深度回答')
    // 5A：HTTP 降级路径透出 lastDeepReport/cards（实现前缺失 → undefined）
    expect(arg.lastDeepReport).toEqual(deepRef)
    expect(arg.cards).toEqual(cards)
  })

  it('HTTP 降级：响应无 last_deep_report/cards 时字段为 undefined（旧协议兼容）', async () => {
    vi.mocked(agentApi.sendMessage).mockResolvedValue({ content: '普通回复', session_id: 's1' } as any)

    const stream = useChatStream() as any
    await stream.send('普通问题')

    expect(mockAppendMessage).toHaveBeenCalledTimes(2)
    const arg = mockAppendMessage.mock.calls[1][0]
    expect(arg.content).toBe('普通回复')
    expect(arg.lastDeepReport).toBeUndefined()
    expect(arg.cards).toBeUndefined()
  })
})
