import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePodcastStore } from './podcast'
import { agentApi } from '@/shared/api/modules/agent'

vi.mock('@/shared/api/modules/agent', () => ({
  agentApi: {
    generatePodcast: vi.fn(),
  },
}))

// happy-dom 无 uni 全局（既有惯例见 StockContent.spec.ts / monitor.spec.ts）：
// 连续模式 buildAndEnqueue 成功/失败分支会调用 uni.showToast，需 stub 避免 unhandled rejection；
// getStorageSync 固定返回空串，保证每个用例 store 初始化 continuousPlay=false（无跨用例持久化泄漏）
vi.stubGlobal('uni', {
  showToast: vi.fn(),
  setStorageSync: vi.fn(),
  getStorageSync: vi.fn(() => ''),
  removeStorageSync: vi.fn(),
  clearStorageSync: vi.fn(),
})

describe('podcast store 互斥 + 排队', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(agentApi.generatePodcast).mockResolvedValue({
      audio_url: '/api/agent/audio/podcast-test.mp3',
      cache_key: 'test',
    } as never)
  })

  it('互斥模式：open 新播报停止外部注册音频', async () => {
    const store = usePodcastStore()
    const stop = vi.fn()
    const release = store.acquireExternal('briefing', stop)
    // 连续开关默认关（互斥）
    expect(store.continuousPlay).toBe(false)
    await store.open('播报文本', 'key-a', '标题A')
    expect(stop).toHaveBeenCalledTimes(1)
    expect(store.audioUrl).toBe('/api/agent/audio/podcast-test.mp3')
    expect(store.status).toBe('ready')
    release()
    expect(store.queue).toHaveLength(0)
  })

  it('连续模式：当前播放中 open 新播报入队，不打断', async () => {
    const store = usePodcastStore()
    store.toggleContinuous()
    expect(store.continuousPlay).toBe(true)
    await store.open('播报文本1', 'key-a', '标题A') // 首次无播放 → 直接播放
    expect(store.status).toBe('ready')
    expect(store.queue).toHaveLength(0)

    store.setPlaying(true) // 模拟 AudioPlayer 正在播放
    void store.open('播报文本2', 'key-b', '标题B') // 后台生成并入队
    await vi.waitFor(() => expect(store.queue).toHaveLength(1))
    expect(store.queue[0]).toMatchObject({ key: 'key-b', title: '标题B' })
    expect(store.audioUrl).toBe('/api/agent/audio/podcast-test.mp3') // 当前音频未被替换
    expect(store.status).toBe('ready') // 播放状态未被触碰
  })

  it('连续模式：ended 后自动播队列下一项', async () => {
    const store = usePodcastStore()
    store.toggleContinuous()
    await store.open('播报文本1', 'key-a', '标题A')
    store.setPlaying(true)
    void store.open('播报文本2', 'key-b', '标题B')
    await vi.waitFor(() => expect(store.queue).toHaveLength(1))
    store.onAudioEnded()
    expect(store.queue).toHaveLength(0)
    expect(store.cacheKey).toBe('key-b')
    expect(store.audioUrl).toBe('/api/agent/audio/podcast-test.mp3')
    expect(store.autoplay).toBe(true)
  })

  it('队列上限 10：超限提示并丢弃', async () => {
    const store = usePodcastStore()
    store.toggleContinuous()
    await store.open('播报文本0', 'key-0', '标题0')
    store.setPlaying(true)
    for (let i = 1; i <= 11; i++) {
      void store.open(`播报文本${i}`, `key-${i}`, `标题${i}`)
    }
    await vi.waitFor(() => expect(store.queue).toHaveLength(10))
  })
})
