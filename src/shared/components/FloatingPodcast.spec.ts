import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FloatingPodcast from './FloatingPodcast.vue'
import { usePodcastStore } from '@/shared/store/modules/podcast'

// AudioPlayer 桩（工厂内联定义：vi.mock 工厂被提升到文件顶部，不能引用顶层变量）
vi.mock('@/shared/components/AudioPlayer.vue', () => ({
  default: { name: 'AudioPlayer', props: ['src'], template: '<view class="audio-player-stub" />' },
}))
vi.mock('@/shared/components/SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', template: '<view class="svg-stub" />' },
}))
// FloatingPodcast 从 barrel 导入 Button/LoadingState/AudioPlayer，mock 掉避免真实组件副作用
vi.mock('./index', () => ({
  Button: { name: 'Button', template: '<view />' },
  LoadingState: { name: 'LoadingState', template: '<view />' },
  AudioPlayer: { name: 'AudioPlayer', props: ['src'], template: '<view class="audio-player-stub" />' },
}))

vi.stubGlobal('uni', {
  getSystemInfoSync: vi.fn(() => ({ windowWidth: 390, windowHeight: 693 })),
  showToast: vi.fn(),
  setStorageSync: vi.fn(),
  getStorageSync: vi.fn(() => ''),
  removeStorageSync: vi.fn(),
  clearStorageSync: vi.fn(),
})

describe('FloatingPodcast 渲染权（页面可见性）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('仅当前前台页面（store.activePage 匹配）的实例渲染；页面切换渲染权随之移交', async () => {
    const store = usePodcastStore()
    store.playDirect('/api/agent/audio/test.mp3', 'k', 'AI 早报', 0)
    expect(store.visible).toBe(true)
    expect(store.status).toBe('ready')

    // 首页常驻实例（MainTabs），首页前台
    store.setActivePage('main-tabs')
    const home = mount(FloatingPodcast, { props: { pageKey: 'main-tabs' } })
    await nextTick()
    expect(home.find('.audio-player-stub').exists()).toBe(true)

    // 进入子页面：activePage 切换，子页面实例渲染，首页实例失活
    const briefing = mount(FloatingPodcast, { props: { pageKey: 'sub2-1' } })
    store.setActivePage('sub2-1')
    await nextTick()
    expect(briefing.find('.audio-player-stub').exists()).toBe(true)
    expect(home.find('.audio-player-stub').exists()).toBe(false)

    // 返回首页：activePage 切回，首页实例恢复渲染
    store.setActivePage('main-tabs')
    await nextTick()
    expect(home.find('.audio-player-stub').exists()).toBe(true)
    expect(briefing.find('.audio-player-stub').exists()).toBe(false)
  })

  it('activePage 为空（页面隐藏）时任何实例都不渲染', async () => {
    const store = usePodcastStore()
    store.playDirect('/api/agent/audio/test.mp3', 'k', 'AI 早报', 0)
    store.setActivePage('') // 页面 onHide
    const wrapper = mount(FloatingPodcast, { props: { pageKey: 'main-tabs' } })
    await nextTick()
    expect(wrapper.find('.audio-player-stub').exists()).toBe(false)
  })
})
