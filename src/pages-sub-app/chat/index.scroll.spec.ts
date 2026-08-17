/**
 * Task 5 (5B) 运行时行为回归 —— index.vue 滚动改造（vitest + mount）
 *
 * 与 index.spec.ts（node:test 源码字符串断言）互补：本文件做真实运行时断言，
 * 是硬约束 #3「spy===1（watch(isStreaming) v=true 唯一滚底收口）」的运行时证据。
 *
 * 断言机制说明：index.vue 是 <script setup> 且未 defineExpose，@vue/test-utils
 * 的 wrapper.vm 不暴露内部函数（scrollToBottom/handleSend/onScroll）与内部 ref
 * （scrollTop/followPaused）。因此用例改用「行为断言」：
 *  - 用例 1：scrollToBottom 的唯一可观测副作用 = scroll-view 的 scroll-top 被设为
 *    99999/99998（scrollToBottom 内 nextTick 交替赋值）。用 MutationObserver 统计
 *    scroll-top 属性变化次数 → 一轮发送内恰好 1 次（若 handleSend 显式滚底 + watch
 *    双发，则会观测到 99999→99998 两次变化）。
 *  - 用例 2：「回到最新」悬浮按钮（v-if="followPaused"）显隐 = followPaused 的可观测
 *    投影 → onScroll 三态（near 恢复 / far 暂停 / unknown 保持）行为断言。
 *
 * 模块级 socket 单例：useChatStream 使用真实实现（不 mock），mock createAgentWebSocket
 * （onOpen 同步连接）使 _stream 直达 WS 发送分支，走 useChatStream.spec.ts 同款基建。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref, reactive, computed } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useChatStream } from '@/shared/utils/useChatStream'
import type { ChatMessage } from '@/shared/api/modules/agent'

// ── 生命周期捕获：onLoad/onShow/onReady 均不自动触发（避免 onShow 自带 scrollToBottom 污染计数）──
const lifecycleMocks = vi.hoisted(() => ({
  onLoad: vi.fn(),
  onShow: vi.fn(),
  onReady: vi.fn(),
}))
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (cb: (options: Record<string, string | undefined>) => void) => lifecycleMocks.onLoad(cb),
  onShow: (cb: () => void) => lifecycleMocks.onShow(cb),
  onReady: (cb: () => void) => lifecycleMocks.onReady(cb),
}))

// ── chatStore mock（对齐 useChatStream.spec.ts 契约：messages/sessionId 必须为真实 ref 供 storeToRefs）──
const chatStoreMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  setFeedback: vi.fn(),
}))
vi.mock('@/shared/store/modules/chat', () => {
  const messages = ref<ChatMessage[]>([])
  const sessionId = ref('')
  return {
    useChatStore: () =>
      reactive({
        messages,
        sessionId,
        hasUserMessage: computed(() => messages.value.some((m) => m.role === 'user')),
        appendMessage: (msg: ChatMessage) => {
          messages.value.push(msg)
        },
        setSessionId: (id: string) => {
          sessionId.value = id
        },
        createSession: () => {
          chatStoreMocks.createSession()
          if (!sessionId.value) sessionId.value = `app_test_${Date.now()}`
        },
        setFeedback: chatStoreMocks.setFeedback,
      }),
  }
})

vi.mock('@/shared/store/modules/user', () => ({
  useUserStore: () => ({ isLoggedIn: () => true }),
}))

vi.mock('@/shared/store/modules/favorites', () => ({
  useFavoritesStore: () => ({
    hasCurrentData: () => true,
    fetchFavorites: vi.fn(),
    stocks: [],
  }),
}))

vi.mock('@/shared/utils/storage', () => ({
  storage: { get: () => false, set: vi.fn() },
  STORAGE_KEYS: {},
}))

vi.mock('@/shared/utils/speechInput', () => ({
  isSpeechInputSupported: () => false,
  startSpeechRecognition: vi.fn(() => Promise.resolve({ ok: false, error: 'unsupported' })),
  stopSpeechRecognition: vi.fn(),
}))

// ── agent API mock（createAgentWebSocket onOpen 同步连接 → _stream 直达 WS 分支；捕获 send/事件回调）──
const mockSocketCbs = vi.hoisted(() => ({
  onMessageCbs: [] as Array<(msg: any) => void>,
  onCloseCbs: [] as Array<(res?: any) => void>,
  onErrorCbs: [] as Array<(res?: any) => void>,
}))
const mockSocketSend = vi.hoisted(() => vi.fn())
const agentApiMock = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  upsertChatSession: vi.fn(),
}))
vi.mock('@/shared/api/modules/agent', () => ({
  createAgentWebSocket: () => ({
    onOpen: (cb: () => void) => cb(),
    onClose: (cb: (res?: any) => void) => {
      mockSocketCbs.onCloseCbs.push(cb)
    },
    onError: (cb: (res?: any) => void) => {
      mockSocketCbs.onErrorCbs.push(cb)
    },
    onMessage: (cb: (msg: any) => void) => {
      mockSocketCbs.onMessageCbs.push(cb)
    },
    send: mockSocketSend,
    close: () => {},
  }),
  agentApi: agentApiMock,
}))

// ── mp-html 桩（包内 WXS 双 script 块 vitest 编译即挂，按页面精确导入路径 mock，同既有先例）──
vi.mock('mp-html/dist/uni-app/components/mp-html/mp-html', () => ({
  default: {
    name: 'mp-html',
    props: ['content'],
    template: '<view class="mp-html-stub" v-html="content"></view>',
  },
}))

// ── 页面本地组件桩（避免副作用；均为纯展示桩）──
vi.mock('@/shared/components/SubPageCard2.vue', () => ({
  default: {
    name: 'SubPageCard2',
    props: ['title', 'noChatBar'],
    template: '<view class="subpage-stub"><slot /></view>',
  },
}))
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'size', 'color'], template: '<view class="svg-stub" />' },
}))
vi.mock('@/shared/components/FeedbackBar.vue', () => ({
  default: { name: 'FeedbackBar', props: ['value'], template: '<view class="feedback-stub" />' },
}))
vi.mock('@/shared/components/ConfirmSheet.vue', () => ({
  default: { name: 'ConfirmSheet', props: ['visible', 'question', 'options', 'waiting'], template: '<view class="confirm-sheet-stub" />' },
}))
vi.mock('./DeepSummaryCard.vue', () => ({
  default: { name: 'DeepSummaryCard', props: ['report'], template: '<view class="deep-summary-stub" />' },
}))
vi.mock('./ReasoningPanel.vue', () => ({
  default: { name: 'ReasoningPanel', props: ['steps', 'execSteps'], template: '<view class="reasoning-stub" />' },
}))
vi.mock('./cards/CardRenderer.vue', () => ({
  default: { name: 'CardRenderer', props: ['cards'], template: '<view class="card-renderer-stub" />' },
}))
vi.mock('./cards/SectionCard.vue', () => ({
  default: { name: 'SectionCard', props: ['variant', 'title', 'body'], template: '<view class="section-card-stub" />' },
}))

// uni 全局（mount 时组件 body 不触碰 uni；goSessions/onReady/handleMicTap 非本测试路径，仍补齐避免缺漏）
vi.stubGlobal('uni', {
  navigateTo: vi.fn(),
  createSelectorQuery: vi.fn(() => ({
    select: vi.fn(() => ({ boundingClientRect: vi.fn(() => ({ exec: vi.fn() })) })),
  })),
  showToast: vi.fn(),
  hideToast: vi.fn(),
})

import ChatIndex from './index.vue'

describe('index.vue 滚动改造（5B）运行时行为', () => {
  beforeEach(() => {
    // 复位模块级 socket 单例（问题 15）+ mock 回调/调用记录（对齐 useChatStream.spec.ts 基建）
    const stream = useChatStream() as any
    stream.messages.value = []
    stream.sessionId.value = ''
    mockSocketCbs.onMessageCbs.length = 0
    mockSocketCbs.onCloseCbs.length = 0
    mockSocketCbs.onErrorCbs.length = 0
    mockSocketSend.mockClear()
    agentApiMock.sendMessage.mockReset()
    agentApiMock.upsertChatSession.mockReset()
    chatStoreMocks.createSession.mockClear()
    stream._testReset()
    lifecycleMocks.onLoad.mockReset()
    lifecycleMocks.onShow.mockReset()
    lifecycleMocks.onReady.mockReset()
  })

  afterEach(() => {
    useChatStream()._testReset()
  })

  it('5B 用例1（spy===1）：handleSend 一轮发送 scrollToBottom 恰好 1 次（watch v=true 唯一收口）', async () => {
    const wrapper = mount(ChatIndex)
    await flushPromises()
    const scrollView = wrapper.find('scroll-view')
    expect(scrollView.exists()).toBe(true)
    // 初始 scroll-top = 0（onShow 未触发，无初始滚底）
    expect(scrollView.attributes('scroll-top')).toBe('0')

    // 行为断言机制：scrollToBottom 的唯一可观测副作用是 scroll-top 被交替设为 99999/99998。
    // <script setup> 未 defineExpose → wrapper.vm 不可达内部函数 → MutationObserver 计数属性变化。
    const flips: string[] = []
    const observer = new MutationObserver(() => {
      const v = scrollView.attributes('scroll-top')
      if (v === '99999' || v === '99998') flips.push(v)
    })
    observer.observe(scrollView.element, { attributes: true, attributeFilter: ['scroll-top'] })

    await wrapper.find('input').setValue('你好')
    await wrapper.find('.send-btn').trigger('tap')
    // 冲刷 Vue scheduler：streaming=true → watch(isStreaming) → scrollToBottom → nextTick 内 scrollTop 赋值
    await flushPromises()
    await flushPromises()
    await nextTick()

    // 整个 send 轮内 scrollToBottom（scroll-top flip）恰好一次 → flips 只有首值 99999
    // （若 handleSend 仍显式滚底，会观测到 99999→99998 两次变化，此处 toEqual 即失败）
    expect(flips).toEqual(['99999'])
    observer.disconnect()
    wrapper.unmount()
  })

  it('5B 用例2（onScroll 三态）：unknown 保持 / far 暂停 / near 恢复（回到最新按钮显隐）', async () => {
    const wrapper = mount(ChatIndex)
    await flushPromises()
    const scrollView = wrapper.find('scroll-view')

    // 初始 followPaused=false → 无「回到最新」按钮
    expect(wrapper.find('.back-to-latest').exists()).toBe(false)

    // unknown（scrollHeight=0，测量失败/初始）→ 保持当前状态（false 不 pause，不打断跟随）
    await scrollView.trigger('scroll', { detail: { scrollTop: 0, scrollHeight: 0 } })
    expect(wrapper.find('.back-to-latest').exists()).toBe(false)

    // far（scrollHeight=2000，viewport 默认 600 → remaining=1400 > 80）→ 暂停跟随
    await scrollView.trigger('scroll', { detail: { scrollTop: 0, scrollHeight: 2000 } })
    expect(wrapper.find('.back-to-latest').exists()).toBe(true)

    // unknown（followPaused=true 时收到测失败）→ 保持 true（不 resume，不钉底）
    await scrollView.trigger('scroll', { detail: { scrollTop: 0, scrollHeight: 0 } })
    expect(wrapper.find('.back-to-latest').exists()).toBe(true)

    // near（scrollTop=1500 → remaining=-100 <= 80）→ 恢复跟随 → 按钮消失
    await scrollView.trigger('scroll', { detail: { scrollTop: 1500, scrollHeight: 2000 } })
    expect(wrapper.find('.back-to-latest').exists()).toBe(false)

    wrapper.unmount()
  })
})
