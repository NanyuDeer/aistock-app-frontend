/**
 * 事件详情 - 业务逻辑
 *
 * 职责：
 * - 根据 eventId 获取详情
 * - loading / error 状态管理
 */

import { ref } from 'vue'
import type { EventDetailResponse } from '../types'
import { getEventDetail } from '../api/eventApi'

export function useEventDetail() {
  // ========== 状态 ==========
  const detail = ref<EventDetailResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ========== 方法 ==========

  /**
   * 获取事件详情
   */
  async function fetchDetail(eventId: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      detail.value = await getEventDetail(eventId)
    } catch (err) {
      error.value = (err as Error).message || '加载事件详情失败'
      detail.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * 清除详情数据
   */
  function clearDetail(): void {
    detail.value = null
    error.value = null
  }

  return {
    detail,
    loading,
    error,
    fetchDetail,
    clearDetail,
  }
}
