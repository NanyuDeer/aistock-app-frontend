/**
 * useEventList.updateFollowStatus 回归测试（vitest）
 *
 * 背景（2026-11-09 缺陷）：事件列表卡片点「关注」后按钮文案不变，但「关注 · N」
 * 入口与关注聚合页都已更新。差异在于更新方式——
 * - 关注聚合页：整表替换（entries.value = ...），卡片正常重渲染；
 * - 列表页：updateFollowStatus 原地 mutate 数组元素（event.isFollowed = x），
 *   卡片没有感知到变化。
 *
 * 因此本用例锁定「不可变更新」契约：
 * 1. 关注状态变化时必须替换数组元素引用（新对象），让子组件拿到新 prop 重渲染；
 * 2. 状态未变化时不替换引用，避免 onShow 全表无意义重渲染；
 * 3. eventId 不存在时安全返回，不动数组。
 */
import { describe, it, expect } from 'vitest'
import { useEventList } from './useEventList'
import type { EventItem } from '../types'

/** 构造一个最小可用的列表项 */
function createEvent(eventId: string, isFollowed = false): EventItem {
  return {
    eventId,
    title: `事件 ${eventId}`,
    publishTime: '2026-11-09 10:00',
    source: 'https://example.com/news',
    eventType: '产业政策',
    affectedIndustries: [],
    aiSummary: '摘要',
    isFollowed,
  }
}

describe('useEventList.updateFollowStatus', () => {
  it('关注状态变化时替换数组元素引用，保证卡片重渲染', () => {
    const { events, updateFollowStatus } = useEventList()
    events.value = [createEvent('evt-1'), createEvent('evt-2')]
    const before = events.value[0]
    const otherBefore = events.value[1]

    updateFollowStatus('evt-1', true)

    // 关键契约：元素被替换成新对象（而不是原地改字段）
    expect(events.value[0]).not.toBe(before)
    expect(events.value[0].isFollowed).toBe(true)
    expect(events.value[0].eventId).toBe('evt-1')
    // 其他条目引用保持不变
    expect(events.value[1]).toBe(otherBefore)
  })

  it('取消关注同样替换引用并写回 false', () => {
    const { events, updateFollowStatus } = useEventList()
    events.value = [createEvent('evt-1', true)]
    const before = events.value[0]

    updateFollowStatus('evt-1', false)

    expect(events.value[0]).not.toBe(before)
    expect(events.value[0].isFollowed).toBe(false)
    expect(events.value[0].eventId).toBe('evt-1')
  })

  it('状态未变化时不替换引用（避免 onShow 全表重渲染）', () => {
    const { events, updateFollowStatus } = useEventList()
    events.value = [createEvent('evt-1', true)]
    const before = events.value[0]

    updateFollowStatus('evt-1', true)

    expect(events.value[0]).toBe(before)
  })

  it('eventId 不存在时安全返回，数组内容不变', () => {
    const { events, updateFollowStatus } = useEventList()
    events.value = [createEvent('evt-1')]
    const before = events.value[0]

    expect(() => updateFollowStatus('not-exist', true)).not.toThrow()
    expect(events.value).toHaveLength(1)
    expect(events.value[0]).toBe(before)
  })
})
