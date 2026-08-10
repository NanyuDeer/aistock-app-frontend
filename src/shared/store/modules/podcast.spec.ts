import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
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
    const play = vi.fn()
    const stop = vi.fn()
    const release = store.acquireExternal('briefing', play, stop)
    expect(play).toHaveBeenCalledTimes(1) // 互斥模式：注册即立即播放
    expect(store.continuousPlay).toBe(false)
    await store.open('播报文本', 'key-a', '标题A')
    expect(stop).toHaveBeenCalledTimes(1)
    expect(store.audioUrl).toBe('/api/agent/audio/podcast-test.mp3')
    expect(store.status).toBe('ready')
    release()
    expect(store.queue).toHaveLength(0)
  })

  it('连续模式：悬浮窗占用时 acquireExternal 挂起，ended 后激活播放', () => {
    const store = usePodcastStore()
    store.toggleContinuous()
    // 模拟悬浮窗正在播放（已就绪 + 播放中）
    store.status = 'ready'
    store.audioUrl = '/api/agent/audio/podcast-test.mp3'
    store.setPlaying(true)
    const play = vi.fn()
    const stop = vi.fn()
    store.acquireExternal('briefing', play, stop)
    expect(play).not.toHaveBeenCalled() // 挂起，不叠音
    expect(store.queue).toHaveLength(0)
    store.onAudioEnded() // 悬浮窗结束 → 激活外部音频
    expect(play).toHaveBeenCalledTimes(1)
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

  it('挂起外部音频：releaseExternal 直接调用清除挂起，避免页面卸载后激活断链', () => {
    const store = usePodcastStore()
    store.toggleContinuous()
    store.status = 'ready'
    store.audioUrl = '/api/agent/audio/podcast-test.mp3'
    store.setPlaying(true)
    const play = vi.fn()
    store.acquireExternal('briefing', play, vi.fn())
    expect(play).not.toHaveBeenCalled() // 挂起
    store.releaseExternal('briefing') // briefing onUnmounted 真实路径：直接调用
    store.onAudioEnded()
    expect(play).not.toHaveBeenCalled() // 挂起已清除，不会激活断链 play
  })

  it('playDirect 默认收起为悬浮球（不展开播放条）', () => {
    const store = usePodcastStore()
    store.playDirect('/api/agent/audio/podcast-test.mp3', 'key-a', 'AI 早报', 0)
    expect(store.visible).toBe(true)
    expect(store.expanded).toBe(false) // 默认悬浮球，用户点击才展开
    expect(store.autoplay).toBe(true)
    expect(store.audioUrl).toBe('/api/agent/audio/podcast-test.mp3')
  })

  it('跨页续播点：播放中卸载记录，暂停态不记录；consumeResume 消费清除', () => {
    const store = usePodcastStore()
    // 播放中 AudioPlayer 卸载 → 记录续播点
    store.suspendPlayback({ playing: true, currentTime: 42 })
    expect(store.resumePending).toBe(true)
    expect(store.playbackTime).toBe(42)
    store.consumeResume()
    expect(store.resumePending).toBe(false)
    expect(store.playbackTime).toBe(0)

    // 暂停态卸载 → 不置续播点，也不覆盖进度（多实例切换时非播放实例不上报）
    store.suspendPlayback({ playing: false, currentTime: 10 })
    expect(store.resumePending).toBe(false)
    expect(store.playbackTime).toBe(0)
  })

  it('渲染权：activePage 标记当前前台页面（页面根容器 onShow/onHide 维护）', () => {
    const store = usePodcastStore()
    expect(store.activePage).toBe('')
    store.setActivePage('sub2-1')
    expect(store.activePage).toBe('sub2-1')
    store.setActivePage('') // 页面 onHide
    expect(store.activePage).toBe('')
  })

  it('clearActivePage 仅清空本页渲染权：旧页失活事件晚于新页激活时不误清新页', () => {
    const store = usePodcastStore()
    store.setActivePage('sub2-2') // 新页已激活
    store.clearActivePage('sub2-1') // 旧页失活事件迟到 → 不覆盖新页
    expect(store.activePage).toBe('sub2-2')
    store.clearActivePage('sub2-2') // 本页真正失活 → 清空
    expect(store.activePage).toBe('')
  })

  it('多实例切换：新页播放器已注册时旧页卸载直接续播（nextTick 后），不等重建', async () => {
    const store = usePodcastStore()
    const ctrlB = { pause: vi.fn(), play: vi.fn(), togglePlay: vi.fn(), seekTo: vi.fn() }
    store.registerPlayer('inst-b', ctrlB) // 新页播放器已注册
    store.suspendPlayback({ playing: true, currentTime: 33 }, 'inst-a') // 旧页卸载上报
    expect(store.resumePending).toBe(false) // 续播点已被直接消费
    await nextTick()
    expect(ctrlB.seekTo).toHaveBeenCalledWith(33)
    expect(ctrlB.play).toHaveBeenCalledTimes(1)
  })

  it('多实例切换：卸载实例本身仍持有播放器时不直接续播，仅记录续播点', async () => {
    const store = usePodcastStore()
    const ctrlA = { pause: vi.fn(), play: vi.fn(), togglePlay: vi.fn(), seekTo: vi.fn() }
    store.registerPlayer('inst-a', ctrlA)
    store.suspendPlayback({ playing: true, currentTime: 20 }, 'inst-a') // 卸载的正是自己
    expect(store.resumePending).toBe(true) // 记录续播点，等待新页重建
    expect(ctrlA.play).not.toHaveBeenCalled()
    await nextTick()
    expect(ctrlA.play).not.toHaveBeenCalled() // 不误播正在销毁的旧播放器
  })

  it('播放器控制注销校验实例归属：失活实例不误清新实例注册', () => {
    const store = usePodcastStore()
    const ctrlA = { pause: vi.fn(), play: vi.fn(), togglePlay: vi.fn() }
    const ctrlB = { pause: vi.fn(), play: vi.fn(), togglePlay: vi.fn() }
    store.registerPlayer('inst-a', ctrlA)
    store.registerPlayer('inst-b', ctrlB) // B 后注册 → 持有控制
    store.unregisterPlayer('inst-a') // A 失活注销 → 不影响 B
    store.pause()
    expect(ctrlB.pause).toHaveBeenCalledTimes(1)
    store.unregisterPlayer('inst-b')
    store.pause() // 无控制句柄 → 静默
    expect(ctrlB.pause).toHaveBeenCalledTimes(1)
  })
})
