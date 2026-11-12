/**
 * 事件关注 - 业务逻辑
 *
 * 职责：
 * - 关注 / 取消关注事件（当前落到本地快照存储，见 eventFollowStore）
 * - loading 状态
 *
 * 服务端接入关注接口后只需替换 eventApi，本文件无需改动。
 */

import { ref } from 'vue'
import type { EventItem } from '../types'
import { followEvent, unfollowEvent } from '../api/eventApi'
import { isEventFollowed } from '../eventFollowStore'

export function useEventFollow() {
  const loading = ref(false)

  /**
   * 关注事件
   * @returns 是否成功（本地写入成功即视为成功）
   */
  async function follow(event: EventItem): Promise<boolean> {
    loading.value = true
    try {
      await followEvent(event)
      return true
    } catch (err) {
      console.error('[useEventFollow] follow failed:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 取消关注事件
   */
  async function unfollow(eventId: string): Promise<boolean> {
    loading.value = true
    try {
      await unfollowEvent(eventId)
      return true
    } catch (err) {
      console.error('[useEventFollow] unfollow failed:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 切换关注状态
   *
   * 以本地存储的真实状态为准，而不是卡片上的 isFollowed——
   * 列表卡片可能是旧渲染（如别处已取消关注），用它判断会切换反方向。
   *
   * @returns 切换后的关注状态
   */
  async function toggleFollow(event: EventItem): Promise<boolean> {
    const shouldFollow = !isEventFollowed(event.eventId)
    const success = shouldFollow ? await follow(event) : await unfollow(event.eventId)
    return success ? shouldFollow : isEventFollowed(event.eventId)
  }

  return {
    loading,
    follow,
    unfollow,
    toggleFollow,
  }
}
