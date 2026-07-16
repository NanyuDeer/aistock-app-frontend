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
import { enrichAffectedIndustries } from '../api/eventService'
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

      // 客户端过滤：按事件类型筛选
      let filtered = res.events
      if (activeType.value !== '全部') {
        filtered = filtered.filter(e => e.eventType === activeType.value)
      }

      // 客户端过滤：仅已关注
      if (filterParams.value.followedOnly) {
        filtered = filtered.filter(e => e.isFollowed)
      }

      // 【临时方案】补充 Top5 受影响行业数据
      // 未来删除：当后端列表接口直接返回 affectedIndustries 后删除此段代码
      let enrichedEvents: EventItem[]
      try {
        // 【关键】enrichAffectedIndustries 返回全新的数组
        // 每个事件对象也是新的引用，确保 Vue 响应式系统检测到变化
        enrichedEvents = await enrichAffectedIndustries(filtered)
      } catch (err) {
        // 异常处理：补充失败时使用原数据
        console.warn('[useEventList] 补充 affectedIndustries 失败:', err)
        enrichedEvents = filtered
      }

      // 根据页码判断是覆盖还是追加
      if (page === 1) {
        events.value = enrichedEvents
      } else {
        // 【关键】创建新数组，确保 Vue 检测到变化
        events.value = [...events.value, ...enrichedEvents]
      }

      // 更新分页信息（基于过滤后的结果估算）
      currentPage.value = res.page
      total.value = filtered.length
      hasMore.value = res.hasMore && filtered.length > 0
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
