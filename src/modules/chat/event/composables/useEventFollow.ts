/**
 * 事件关注 - 业务逻辑
 *
 * 职责：
 * - 关注/取消关注事件
 * - loading 状态
 */

import { ref } from 'vue'
import { followEvent, unfollowEvent } from '../api/eventApi'

export function useEventFollow() {
  const loading = ref(false)

  /**
   * 关注事件
   */
  async function follow(eventId: string): Promise<boolean> {
    loading.value = true
    try {
      await followEvent(eventId)
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
   */
  async function toggleFollow(eventId: string, currentState: boolean): Promise<boolean> {
    return currentState ? unfollow(eventId) : follow(eventId)
  }

  return {
    loading,
    follow,
    unfollow,
    toggleFollow,
  }
}
