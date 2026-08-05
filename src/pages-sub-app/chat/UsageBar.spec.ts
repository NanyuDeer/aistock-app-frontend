import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import UsageBar from './UsageBar.vue'

const getTokenUsageSummary = vi.hoisted(() => vi.fn())
vi.mock('@/shared/api/modules/agent', () => ({
  agentApi: { getTokenUsageSummary: (...a: unknown[]) => getTokenUsageSummary(...a) },
}))

const getMock = vi.hoisted(() => vi.fn())
vi.mock('@/shared/utils/storage', () => ({
  STORAGE_KEYS: {
    CHAT_HISTORY: 'chat_history',
    CHAT_SESSION_ID: 'chat_session_id',
    CHAT_SESSION_USAGE: 'chat_session_usage',
  },
  storage: { get: getMock, set: vi.fn(), remove: vi.fn() },
}))

const isLoggedInMock = vi.hoisted(() => vi.fn())
vi.mock('@/shared/store/modules/user', () => ({
  useUserStore: () => ({ isLoggedIn: isLoggedInMock, userInfo: null }),
}))

import { useChatStore } from '@/shared/store/modules/chat'

describe('UsageBar（P11 T6 计费条）', () => {
  beforeEach(() => {
    getMock.mockImplementation((key: string) => {
      if (key === 'chat_session_usage') return null
      if (key === 'chat_session_id') return ''
      return null
    })
    getTokenUsageSummary.mockReset()
    isLoggedInMock.mockReset()
    setActivePinia(createPinia())
  })

  it('未登录且无本次用量时不渲染，不调接口', async () => {
    isLoggedInMock.mockReturnValue(false)
    const wrapper = mount(UsageBar)
    await flushPromises()
    expect(getTokenUsageSummary).not.toHaveBeenCalled()
    expect(wrapper.find('.usage-bar').exists()).toBe(false)
  })

  it('登录时拉取用户累计并展示「累计 X ｜ 本次 Y」', async () => {
    isLoggedInMock.mockReturnValue(true)
    getTokenUsageSummary.mockResolvedValue({
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300,
      turn_count: 5,
    })
    const store = useChatStore()
    store.setSessionId('s1')
    store.appendMessage({
      role: 'assistant',
      content: '回答',
      tokenUsage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      timestamp: 1,
    })

    const wrapper = mount(UsageBar)
    await flushPromises()
    expect(getTokenUsageSummary).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('300')
    expect(wrapper.text()).toContain('30')
  })

  it('未登录但有本次会话本地累加时只显示本次', async () => {
    isLoggedInMock.mockReturnValue(false)
    const store = useChatStore()
    store.setSessionId('s2')
    store.appendMessage({
      role: 'assistant',
      content: '回答',
      tokenUsage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      timestamp: 1,
    })

    const wrapper = mount(UsageBar)
    await flushPromises()
    expect(wrapper.find('.usage-bar').exists()).toBe(true)
    expect(wrapper.text()).toContain('2')
    expect(getTokenUsageSummary).not.toHaveBeenCalled()
  })
})
