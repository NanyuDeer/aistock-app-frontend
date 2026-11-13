/**
 * 事件关注本地快照存储 - 单元测试
 *
 * 覆盖：空态 / 关注置顶 / 幂等去重 / 取消关注 / toggle 返回值 / 容量上限 /
 *      脏数据容错 / 快照字段裁剪 / 卡片数据转换
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed } from 'vue'
import type { EventItem } from './types'

/** 内存 storage 替身（uni.getStorageSync 无 key 时返回 ''，与真实行为一致） */
const memory = new Map<string, unknown>()

vi.stubGlobal('uni', {
  getStorageSync: (key: string) => (memory.has(key) ? memory.get(key) : ''),
  setStorageSync: (key: string, value: unknown) => {
    memory.set(key, value)
  },
  removeStorageSync: (key: string) => {
    memory.delete(key)
  },
})

import {
  EVENT_FOLLOW_STORAGE_KEY,
  MAX_FOLLOWED_EVENTS,
  listFollowedEntries,
  isEventFollowed,
  followEvent,
  unfollowEvent,
  toggleEventFollow,
  followedCount,
  toEventItem,
} from './eventFollowStore'

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    eventId: 'evt-1',
    title: '测试事件',
    source: 'https://example.com/a',
    sourceInfo: { name: 'example.com', url: 'https://example.com/a' },
    publishTime: '2026-11-01 09:00',
    eventType: '产业政策',
    importance: 4,
    affectedIndustries: [
      {
        name: '半导体',
        impactLevel: 4,
        sentiment: 'bullish',
        impactStrength: 0.8,
        impactPercentage: 8.5,
        reason: '政策扶持',
      },
    ],
    aiSummary: '一句话结论',
    isFollowed: false,
    impactVitality: { score: 0.9, status: 'alive', statDate: '2026-11-01' },
    ...overrides,
  }
}

beforeEach(() => {
  memory.clear()
})

describe('事件关注本地快照存储', () => {
  it('无任何关注时返回空列表', () => {
    expect(listFollowedEntries()).toEqual([])
    expect(isEventFollowed('evt-1')).toBe(false)
    expect(followedCount()).toBe(0)
  })

  it('关注后按关注时间倒序返回，并落本地存储', () => {
    followEvent(makeEvent({ eventId: 'a', title: 'A' }))
    followEvent(makeEvent({ eventId: 'b', title: 'B' }))

    const entries = listFollowedEntries()
    expect(entries.map((e) => e.event.eventId)).toEqual(['b', 'a'])
    expect(Array.isArray(memory.get(EVENT_FOLLOW_STORAGE_KEY))).toBe(true)
    expect(followedCount()).toBe(2)
  })

  it('快照不保存 impactVitality（避免关注页展示过期存活度）', () => {
    followEvent(makeEvent())
    const snapshot = listFollowedEntries()[0].event
    expect('impactVitality' in snapshot).toBe(false)
  })

  it('重复关注同一事件不产生重复项，并刷新快照到最前', () => {
    followEvent(makeEvent({ eventId: 'a', title: 'A-旧' }))
    followEvent(makeEvent({ eventId: 'b', title: 'B' }))
    followEvent(makeEvent({ eventId: 'a', title: 'A-新' }))

    const entries = listFollowedEntries()
    expect(entries.map((e) => e.event.eventId)).toEqual(['a', 'b'])
    expect(entries[0].event.title).toBe('A-新')
  })

  it('取消关注后从列表移除', () => {
    followEvent(makeEvent({ eventId: 'a' }))
    followEvent(makeEvent({ eventId: 'b' }))

    unfollowEvent('a')

    expect(isEventFollowed('a')).toBe(false)
    expect(listFollowedEntries().map((e) => e.event.eventId)).toEqual(['b'])
  })

  it('toggle 返回切换后的状态', () => {
    const event = makeEvent()

    expect(toggleEventFollow(event)).toBe(true)
    expect(isEventFollowed('evt-1')).toBe(true)

    expect(toggleEventFollow(event)).toBe(false)
    expect(isEventFollowed('evt-1')).toBe(false)
  })

  it('超过上限时淘汰最早关注的事件', () => {
    for (let i = 0; i < MAX_FOLLOWED_EVENTS + 2; i++) {
      followEvent(makeEvent({ eventId: `e${i}`, title: `E${i}` }))
    }

    expect(listFollowedEntries()).toHaveLength(MAX_FOLLOWED_EVENTS)
    expect(isEventFollowed('e0')).toBe(false)
    expect(isEventFollowed('e1')).toBe(false)
    expect(isEventFollowed(`e${MAX_FOLLOWED_EVENTS + 1}`)).toBe(true)
  })

  it('本地数据损坏时按空列表处理，不抛错', () => {
    memory.set(EVENT_FOLLOW_STORAGE_KEY, 'not-an-array')
    expect(listFollowedEntries()).toEqual([])
  })

  it('脏元素被丢弃，缺字段的合法快照被补全', () => {
    memory.set(EVENT_FOLLOW_STORAGE_KEY, [
      { foo: 1 },
      null,
      { event: null, followedAt: 1 },
      { event: { eventId: 'ok', title: 'OK' }, followedAt: 1 },
    ])

    const entries = listFollowedEntries()
    expect(entries.map((e) => e.event.eventId)).toEqual(['ok'])
    expect(entries[0].event.eventType).toBe('产业政策')
    expect(entries[0].event.affectedIndustries).toEqual([])
    expect(entries[0].event.aiSummary).toBe('')
  })

  it('关注态是响应式的：写入后依赖 isEventFollowed 的计算属性自动更新', () => {
    // 卡片按钮直接依赖 isEventFollowed 求值（见 EventItemCard 的 isFollowed），
    // 必须保证「写本地快照 → 按钮重渲染」不依赖父组件替换 v-for 元素。
    const followed = computed(() => isEventFollowed('evt-1'))

    expect(followed.value).toBe(false)

    followEvent(makeEvent())
    expect(followed.value).toBe(true)

    unfollowEvent('evt-1')
    expect(followed.value).toBe(false)
  })

  it('toEventItem 生成的卡片数据恒为已关注', () => {
    followEvent(makeEvent())
    const item = toEventItem(listFollowedEntries()[0])

    expect(item.isFollowed).toBe(true)
    expect(item.eventId).toBe('evt-1')
    expect(item.affectedIndustries).toHaveLength(1)
    expect(item.sourceInfo?.name).toBe('example.com')
  })
})
