import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

type MessageHandler = (payload: { data: string }) => void

function socket() {
  let open: (() => void) | undefined
  let message: MessageHandler | undefined
  return {
    readyState: 1,
    onOpen: (handler: () => void) => { open = handler },
    onMessage: (handler: MessageHandler) => { message = handler },
    onClose: vi.fn(),
    onError: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    open: () => open?.(),
    message: (event: unknown) => message?.({ data: JSON.stringify(event) }),
  }
}

const fixtures = vi.hoisted(() => ({
  agentSocket: (() => { let open: (() => void) | undefined; let message: MessageHandler | undefined; let handlerReady!: () => void; const messageHandlerReady = new Promise<void>(resolve => { handlerReady = resolve }); return { readyState: 1, onOpen: (handler: () => void) => { open = handler }, onMessage: (handler: MessageHandler) => { message = handler; handlerReady() }, onClose: vi.fn(), onError: vi.fn(), send: vi.fn(), close: vi.fn(), open: () => open?.(), waitForMessageHandler: () => messageHandlerReady, message: (event: unknown) => message?.({ data: JSON.stringify(event) }) } })(),
  streamingSocket: (() => { let open: (() => void) | undefined; let message: MessageHandler | undefined; return { readyState: 1, onOpen: (handler: () => void) => { open = handler }, onMessage: (handler: MessageHandler) => { message = handler }, onClose: vi.fn(), onError: vi.fn(), send: vi.fn(), close: vi.fn(), open: () => open?.(), message: (event: unknown) => message?.({ data: JSON.stringify(event) }) } })(),
  sendMessage: vi.fn(),
}))
const trace = {
  schema_version: 'advisor_trace.v1',
  subquestions: [{ intent: 'stock', reports: [], sources: [], as_of: null, missing_sources: ['stock_trace'], degraded: true }],
  missing_sources: ['stock_trace'],
  degraded: true,
}

vi.mock('@/shared/api/modules/agent', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/api/modules/agent')>(),
  agentApi: { sendMessage: fixtures.sendMessage },
  createAgentWebSocket: () => fixtures.agentSocket,
  createWebSocket: () => fixtures.streamingSocket,
}))

;(globalThis as { uni: Record<string, unknown> }).uni = {
  getStorageSync: () => '', setStorageSync: vi.fn((_key: string, value: unknown) => JSON.parse(JSON.stringify(value))), removeStorageSync: vi.fn(), clearStorageSync: vi.fn(),
}

import { useChatStore } from '@/shared/store/modules/chat'
import { useChatStream } from '@/shared/utils/useChatStream'
import { useStreamingChat } from '@/shared/utils/useStreamingChat'

describe('advisor_trace 传输落盘', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fixtures.sendMessage.mockReset()
    fixtures.agentSocket.send.mockClear()
    fixtures.streamingSocket.send.mockClear()
    ;(globalThis.uni.setStorageSync as ReturnType<typeof vi.fn>).mockClear()
  })

  it('HTTP 普通结果将同一 advisor_trace 保存到 assistant message', async () => {
    fixtures.sendMessage.mockResolvedValue({ content: '正文不作为判断依据', advisor_trace: trace })
    const store = useChatStore()

    await store.sendMessage('请求')

    expect(store.messages[1]?.advisorTrace).toEqual(trace)
  })

  it('Agent 流 done 将同一 advisor_trace 保存到 assistant message', async () => {
    const stream = useChatStream()
    const pending = stream.send('请求')
    fixtures.agentSocket.open()
    await fixtures.agentSocket.waitForMessageHandler()
    fixtures.agentSocket.message({ type: 'done', content: '正文不作为判断依据', advisor_trace: trace })

    await pending
    expect(useChatStore().messages[1]?.advisorTrace).toEqual(trace)
  })

  it('旧流式 done 将同一 advisor_trace 保存到已有 assistant message', () => {
    const wrapper = mount(defineComponent({
      setup: () => ({ stream: useStreamingChat() }),
      template: '<div />',
    }))
    wrapper.vm.stream.connect()
    fixtures.streamingSocket.message({ type: 'text', content: '正文不作为判断依据' })
    fixtures.streamingSocket.message({ type: 'done', advisor_trace: trace })

    expect(useChatStore().messages[0]?.advisorTrace).toEqual(trace)
    expect((globalThis.uni.setStorageSync as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value).toEqual(expect.arrayContaining([
      expect.objectContaining({ advisorTrace: trace }),
    ]))
    wrapper.unmount()
  })
})
