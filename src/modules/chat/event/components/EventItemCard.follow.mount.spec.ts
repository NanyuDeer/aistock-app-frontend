/**
 * EventItemCard 关注按钮端到端挂载测试（vitest）
 *
 * 复现真实链路的最后一公里：
 * 点击卡片内 Button → EventItemCard 冒泡 toggle-follow → 页面 handleFollow
 * → toggleFollow（写本地快照）→ updateFollowStatus → 卡片重渲染为「已关注」。
 *
 * 该用例用于证明「点关注后按钮文案必须变化」，防止再次回归。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import EventItemCard from './EventItemCard.vue'
import { useEventList } from '../composables/useEventList'
import { useEventFollow } from '../composables/useEventFollow'
import type { EventItem } from '../types'

/** uni 存储替身（内存 Map） */
const memory = new Map<string, unknown>()

beforeEach(() => {
  memory.clear()
  vi.stubGlobal('uni', {
    getStorageSync: (key: string) => memory.get(key) ?? '',
    setStorageSync: (key: string, value: unknown) => { memory.set(key, value) },
    removeStorageSync: (key: string) => { memory.delete(key) },
    showToast: () => {},
  })
})

function createEvent(): EventItem {
  return {
    eventId: 'evt-1',
    title: '测试事件',
    publishTime: '2026-11-09 10:00',
    source: 'https://example.com/news',
    eventType: '产业政策',
    affectedIndustries: [],
    aiSummary: '摘要',
    isFollowed: false,
  }
}

describe('EventItemCard 关注按钮', () => {
  it('点击关注后按钮文案变为「已关注」，再点回到「关注」', async () => {
    const Host = defineComponent({
      setup() {
        const { events, updateFollowStatus } = useEventList()
        events.value = [createEvent()]
        const { toggleFollow } = useEventFollow()

        async function handleFollow(event: EventItem) {
          const followed = await toggleFollow(event)
          updateFollowStatus(event.eventId, followed)
        }

        return () => h('div', events.value.map(event => h(EventItemCard, {
          key: event.eventId,
          event,
          onToggleFollow: handleFollow,
        })))
      },
    })

    const wrapper = mount(Host)
    expect(wrapper.text()).toContain('关注')

    // 第一次点击：关注
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('已关注')

    // 第二次点击：取消关注
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('关注')
    expect(wrapper.text()).not.toContain('已关注')
  })

  it('父组件未回传新数组元素时，按钮仍立即变为「已关注」', async () => {
    // 真实故障场景：App/小程序端 v-for 子组件的 prop 更新不可靠，
    // 列表父组件只写本地快照、没有把新元素传下来，按钮也必须跟着切换。
    const Host = defineComponent({
      setup() {
        const event = createEvent()
        const { toggleFollow } = useEventFollow()

        async function handleFollow(target: EventItem) {
          await toggleFollow(target)
          // 故意不调用 updateFollowStatus，也不替换数组元素
        }

        return () => h('div', [h(EventItemCard, { event, onToggleFollow: handleFollow })])
      },
    })

    const wrapper = mount(Host)
    expect(wrapper.text()).toContain('关注')

    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('已关注')

    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('已关注')
  })

  it('写入方与卡片不共享 store 实例时（HMR/双实例），点击后按钮仍必须切换', async () => {
    // 复现真实故障形态：卡片持有的 store 模块实例与页面写入方不是同一个，
    // 卡片的响应式订阅收不到写入通知（实测「点关注后按钮毫无变化」）。
    // 按钮必须由卡片自身状态驱动，点击即切换。
    vi.resetModules()
    const isolatedStore = await import('../eventFollowStore')

    const Host = defineComponent({
      setup() {
        const event = createEvent()

        function handleFollow(target: EventItem) {
          isolatedStore.toggleEventFollow(target)
        }

        return () => h('div', [h(EventItemCard, { event, onToggleFollow: handleFollow })])
      },
    })

    const wrapper = mount(Host)
    expect(wrapper.text()).toContain('关注')

    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('已关注')
  })
})
