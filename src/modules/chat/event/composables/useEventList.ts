/**
 * 事件列表 - 业务逻辑
 *
 * 职责：
 * - 分页加载事件列表
 * - loading / error 状态管理
 * - 下拉刷新 / 上拉加载更多
 * - 事件类型筛选（activeType）
 * - 已关注筛选（followedOnly）
 */

import { ref, computed } from 'vue'
import type { EventItem, EventListParams } from '../types'
import { getEventList } from '../api/eventApi'
import { DEFAULT_PAGE_SIZE } from '../constants'

export function useEventList() {
  // ========== 状态 ==========
  const events = ref<EventItem[]>([])
  const loading = ref(false)
  const refreshing = ref(false)
  const error = ref<string | null>(null)
  const currentPage = ref(1)
  const total = ref(0)
  const hasMore = ref(false)

  /** 当前事件类型筛选（'全部' 表示不过滤） */
  const activeType = ref<string>('全部')

  // 筛选参数
  const filterParams = ref<EventListParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  // ========== 计算属性 ==========
  const isEmpty = computed(() => !loading.value && events.value.length === 0)

  // ========== 方法 ==========

  /**
   * 加载事件列表（追加模式）
   * 在 API 返回结果后，根据 activeType / followedOnly 进行客户端过滤
   */
  async function loadEvents(page = 1): Promise<void> {
    if (loading.value) return

    loading.value = true
    error.value = null

    try {
      const params: EventListParams = {
        page,
        pageSize: filterParams.value.pageSize,
        type: filterParams.value.type,
        eventType: activeType.value !== '全部' ? (activeType.value as EventItem['eventType']) : undefined,
        followedOnly: filterParams.value.followedOnly,
      }

      const res = await getEventList(params)

      // 方案A（2026-08-14）：事件类型由服务端筛选 + 服务端分页（getEventList 透传
      // eventType），前端不再对分页结果做 eventType 二次过滤——否则第 1 页恰好无该
      // 类型时列表为空且 hasMore 失效（旧 bug）。
      let filtered = res.events

      // 客户端过滤：仅已关注
      if (filterParams.value.followedOnly) {
        filtered = filtered.filter(e => e.isFollowed)
      }

      // 第三阶段：列表接口已直出 chain_summary，adapter 已生成 affectedIndustries，
      // 不再调用 enrichAffectedIndustries（N+1 补数）。旧兼容逻辑保留在 eventService 中备用。
      const enrichedEvents = filtered

      // 根据页码判断是覆盖还是追加
      if (page === 1) {
        events.value = enrichedEvents
      } else {
        // 【关键】创建新数组，确保 Vue 检测到变化
        events.value = [...events.value, ...enrichedEvents]
      }

      // 更新分页信息（total/hasMore 直接采用服务端筛选后结果）
      currentPage.value = res.page
      total.value = res.total
      hasMore.value = res.hasMore
    } catch (err) {
      error.value = (err as Error).message || '加载事件列表失败'
    } finally {
      loading.value = false
    }
  }

  /**
   * 下拉刷新（重置到第1页）
   */
  async function refresh(): Promise<void> {
    refreshing.value = true
    await loadEvents(1)
    refreshing.value = false
  }

  /**
   * 加载更多（下一页）
   */
  async function loadMore(): Promise<void> {
    if (loading.value || !hasMore.value) return
    await loadEvents(currentPage.value + 1)
  }

  /**
   * 切换分类筛选（已关注等）
   */
  async function setFilter(params: Partial<EventListParams>): Promise<void> {
    filterParams.value = { ...filterParams.value, ...params }
    currentPage.value = 1
    await loadEvents(1)
  }

  /**
   * 切换事件类型筛选
   * @param type - EventType 或 '全部'
   */
  async function setEventType(type: string): Promise<void> {
    if (activeType.value === type) return
    activeType.value = type
    currentPage.value = 1
    await loadEvents(1)
  }

  /**
   * 本地更新关注状态（乐观更新）
   */
  function updateFollowStatus(eventId: string, followed: boolean): void {
    const event = events.value.find(e => e.eventId === eventId)
    if (event) {
      event.isFollowed = followed
    }
  }

  return {
    // 状态
    events,
    loading,
    refreshing,
    error,
    currentPage,
    total,
    hasMore,
    isEmpty,
    filterParams,
    activeType,

    // 方法
    loadEvents,
    refresh,
    loadMore,
    setFilter,
    setEventType,
    updateFollowStatus,
  }
}
