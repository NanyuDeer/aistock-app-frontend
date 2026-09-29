<template>
  <SubPageCard>
    <view class="timeline-content">
      <!-- 加载中（首屏） -->
      <view v-if="loading && items.length === 0" class="state-container">
        <SvgIcon name="time-line" size="64rpx" color="var(--ev-text-muted)" />
        <text class="state-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="isEmpty" class="state-container">
        <SvgIcon name="inbox-line" size="64rpx" color="var(--ev-text-muted)" />
        <text class="state-text">暂无事件数据</text>
        <view class="retry-btn" @tap="refresh">
          <text class="retry-text">点击刷新</text>
        </view>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="error" class="state-container">
        <SvgIcon name="error-warning-line" size="64rpx" color="var(--ev-negative)" />
        <text class="state-text error-text">{{ error }}</text>
        <view class="retry-btn" @tap="refresh">
          <text class="retry-text">重试</text>
        </view>
      </view>

      <!-- 事件时间线列表（仿韭研公社 /timeline：左侧竖线 + 圆点节点 + 日期分组头 + 无边框事件行） -->
      <template v-else>
        <view class="timeline-list">
          <!-- 竖向时间线 -->
          <view class="tl-line" />

          <view v-for="group in groupedItems" :key="group.date" class="time-item">
            <!-- 日期分组头：MM-DD 周X + 相对标签 -->
            <view class="time-header">
              <view class="tl-dot" />
              <text class="date">{{ formatDateDisplay(group.date) }}</text>
              <text class="weekday">{{ weekdayOf(group.date) }}</text>
              <text
                v-if="relativeTag(group.date)"
                class="date-tag"
                :class="'date-tag--' + relativeTag(group.date)"
              >{{ relativeText(group.date) }}</text>
            </view>

            <!-- 分组内事件行 -->
            <view
              v-for="event in group.events"
              :key="event.eventId"
              class="time-article-item"
              :class="{ 'time-article-item--expanded': expandedId === event.eventId }"
              @tap="handleEventClick(event)"
            >
              <!-- 第一行：标题（完整显示，核心影响板块紧跟标题文字末尾） -->
              <view class="item-top">
                <text class="title">{{ event.title }}</text>
                <!-- 影响板块：只显示最核心 1 个（后端 impactSectors 已按 impactStrength 降序，首个即最核心）；空则不渲染（方案 A） -->
                <text v-if="topSector(event)" class="sector-tag">{{ topSector(event) }}</text>
              </view>

              <!-- 摘要（非空时渲染） -->
              <text v-if="event.summary" class="summary">{{ event.summary }}</text>

              <!-- 展开区域（未来事件点击后展开） -->
              <view v-if="expandedId === event.eventId && event.eventStatus !== 'occurred'" class="event-expand">
                <text class="expand-text">事件尚未发生，暂无传导分析</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view class="load-more-area">
          <view v-if="loadingMore" class="load-more-btn">
            <text class="load-more-text">加载中...</text>
          </view>
          <view v-else-if="hasMore" class="load-more-btn" @tap="loadMore">
            <text class="load-more-text">加载更多</text>
          </view>
          <view v-else-if="items.length > 0" class="load-more-btn">
            <text class="load-more-text done-text">— 已加载全部 {{ total }} 条事件 —</text>
          </view>
        </view>
      </template>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
/**
 * 重大事件时间线页面
 *
 * 仿韭研公社 /timeline 排版：左侧竖向时间线（竖线 + 蓝色圆点节点）+ 日期分组头 + 无边框紧凑事件行。
 * 单一时间轴，不区分未来/历史 Tab。窗口覆盖 [今天-30, 今天+90]，日期升序。
 * 已发生事件跳转详情页，未来事件就地展开。
 * 接口：GET /api/agent/event/timeline
 */
import { computed, onMounted, ref } from 'vue'
import type { EventTimelineItem, EventTimelineQuery } from '@/modules/chat/event/types'
import { getEventTimeline } from '@/modules/chat/event/api/eventApi'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

// ========== 获取上海今天日期 ==========
const now = new Date()
const todayStr = dateStrOf(now)

// 明天
const tomorrowDate = new Date(now)
tomorrowDate.setDate(tomorrowDate.getDate() + 1)
const tomorrowStr = dateStrOf(tomorrowDate)

// 未来 90 天后
const futureDate = new Date(now)
futureDate.setDate(futureDate.getDate() + 90)
const futureStr = dateStrOf(futureDate)

// 30 天前
const pastDate = new Date(now)
pastDate.setDate(pastDate.getDate() - 30)
const pastStr = dateStrOf(pastDate)

/** 本地 Date → YYYY-MM-DD */
function dateStrOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ========== 状态 ==========
const items = ref<EventTimelineItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const total = ref(0)
const hasMore = ref(false)
const page = ref(1)
const pageSize = 20
const expandedId = ref<string | null>(null)

// ========== 计算属性 ==========
const isEmpty = computed(() => !loading.value && !error.value && items.value.length === 0)

/**
 * 按 date 分组，组间升序（旧 → 新），组内按 eventStartTime 升序
 */
const groupedItems = computed(() => {
  const groups = new Map<string, EventTimelineItem[]>()
  for (const item of items.value) {
    const list = groups.get(item.date) || []
    list.push(item)
    groups.set(item.date, list)
  }

  // 组内排序
  for (const [, events] of groups) {
    events.sort((a, b) => a.eventStartTime.localeCompare(b.eventStartTime))
  }

  // 组间排序：升序
  const sortedDates = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b))

  return sortedDates.map(date => ({
    date,
    events: groups.get(date)!,
  }))
})

// ========== 方法 ==========

/** 单窗口查询参数：过去 30 天 → 未来 90 天，升序 */
function timelineQuery(pageNum: number): EventTimelineQuery {
  return {
    dateFrom: pastStr,
    dateTo: futureStr,
    order: 'asc',
    page: pageNum,
    pageSize,
  }
}

/** 刷新（首次加载 / 重试） */
async function refresh() {
  // 并发去重：uni-app H5 dev 下页面可能被挂载两次（KeepAlive 重建），
  // 无守卫会对同一查询发两次请求；加载中直接返回（对齐 list.vue 的不可重入约定）
  if (loading.value) return
  loading.value = true
  error.value = null
  page.value = 1
  items.value = []

  try {
    const res = await getEventTimeline(timelineQuery(1))
    items.value = res.items
    total.value = res.total
    hasMore.value = res.hasMore
    page.value = 1
  } catch (e: unknown) {
    error.value = (e as Error).message || '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

/** 加载更多 */
async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true

  try {
    const nextPage = page.value + 1
    const res = await getEventTimeline(timelineQuery(nextPage))
    // 去重：已加载的 eventId 不重复添加
    const existingIds = new Set(items.value.map(i => i.eventId))
    const newItems = res.items.filter(i => !existingIds.has(i.eventId))
    items.value = [...items.value, ...newItems]
    total.value = res.total
    hasMore.value = res.hasMore
    page.value = nextPage
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

/** 事件点击处理 */
function handleEventClick(event: EventTimelineItem) {
  // 已发生事件 → 跳转详情页
  if (event.eventStatus === 'occurred') {
    uni.navigateTo({
      url: `/modules/chat/pages/event/detail?id=${event.eventId}`,
    })
    return
  }

  // 未发生事件 → 就地展开/收起
  if (expandedId.value === event.eventId) {
    expandedId.value = null
  } else {
    expandedId.value = event.eventId
  }
}

/**
 * 影响板块：只返回最核心 1 个（后端 impactSectors 已按 impactStrength 降序，首个即最核心）。
 * impactSectors 可能缺失（旧数据）→ 防御为 null（整块不渲染）
 */
function topSector(event: EventTimelineItem): string | null {
  const sectors = event.impactSectors ?? []
  return sectors.length > 0 ? sectors[0] : null
}

/** 格式化日期分组显示：韭研风格 MM-DD */
function formatDateDisplay(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[1]}-${parts[2]}`
  }
  return dateStr
}

/** 日期 → 星期中文（date 为后端上海时区 YYYY-MM-DD，仅展示用，不做分组键） */
function weekdayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
}

/** 相对日期标签 key：只保留今天/明天（用户验收：去掉"已过去/未来"冗余相对标签） */
function relativeTag(dateStr: string): 'today' | 'tomorrow' | null {
  if (dateStr === todayStr) return 'today'
  if (dateStr === tomorrowStr) return 'tomorrow'
  return null
}

/** 相对日期标签文案 */
function relativeText(dateStr: string): string {
  if (dateStr === todayStr) return '今天'
  if (dateStr === tomorrowStr) return '明天'
  return ''
}

// ========== 生命周期 ==========
onMounted(() => {
  refresh()
})
</script>

<style scoped>
.timeline-content {
  padding: 0 32rpx 40rpx;
}

/* ===== 时间线列表（左侧竖线 + 内容缩进） ===== */
.timeline-list {
  position: relative;
  padding-left: 132rpx;
}

/* 竖向时间线：贯穿整列 */
.tl-line {
  position: absolute;
  left: 100rpx;
  /* 竖线从首个圆点中心开始（首个 .time-header 高 48rpx，圆点 top:50% → 中心在 24rpx），
     避免圆点上方残留一段线看起来像被截断 */
  top: 24rpx;
  bottom: 0;
  width: 2rpx;
  background: var(--ev-accent);
}

/* ===== 日期分组头（韭研：MM-DD 周X，17px 深色） ===== */
.time-item {
  margin-bottom: 40rpx;
}

.time-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 48rpx;
  margin-bottom: 16rpx;
}

/* 圆点节点：8px 圆形，居中于竖线（竖线 left:100rpx → 相对缩进 132rpx 的内容区为 -40rpx） */
.tl-dot {
  position: absolute;
  left: -40rpx;
  top: 50%;
  width: 16rpx;
  height: 16rpx;
  margin-top: -8rpx;
  border-radius: 50%;
  background: var(--ev-accent);
}

.date {
  font-size: 34rpx;
  color: var(--ev-text-primary);
  font-weight: 500;
}

.weekday {
  font-size: 26rpx;
  color: var(--ev-text-secondary);
}

.date-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

.date-tag--today {
  background: var(--ev-accent);
  color: #ffffff;
}

.date-tag--tomorrow {
  background: var(--ev-accent-soft);
  color: var(--ev-accent);
}

/* ===== 事件行（韭研：无卡片背景/边框，紧凑行） ===== */
.time-article-item {
  margin-bottom: 30rpx;
  padding-left: 4rpx;
}

.time-article-item:active {
  opacity: 0.7;
}

.time-article-item--expanded .title {
  color: var(--ev-accent);
}

.item-top {
  /* 块级容器：标题与影响板块在同一 inline 流，板块紧跟标题最后一个字 */
  display: block;
}

.title {
  display: inline;
  font-size: 30rpx;
  font-weight: 500;
  color: var(--ev-text-primary);
  line-height: 40rpx;
  /* 标题完整显示（可换行）；行业标签紧跟文字末尾 */
  white-space: normal;
  word-break: break-all;
}

/* 核心影响板块标签（紧跟标题文字末尾，inline 胶囊） */
.sector-tag {
  display: inline-block;
  vertical-align: middle;
  margin-left: 10rpx;
  font-size: 20rpx;
  line-height: 34rpx;
  padding: 0 12rpx;
  border-radius: 8rpx;
  background: var(--ev-accent-soft);
  color: var(--ev-accent);
  white-space: nowrap;
}

.summary {
  font-size: 24rpx;
  color: var(--ev-text-secondary);
  line-height: 1.5;
  margin-top: 8rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
}

/* ===== 展开区域 ===== */
.event-expand {
  margin-top: 12rpx;
  padding: 14rpx 16rpx;
  background: var(--ev-accent-bg);
  border-radius: 8rpx;
}

.expand-text {
  font-size: 24rpx;
  color: var(--ev-text-tertiary);
  line-height: 1.5;
  display: block;
}

/* ===== 加载更多 / 状态区域 ===== */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 32rpx;
}

.state-text {
  font-size: 28rpx;
  color: var(--ev-text-muted);
  margin-bottom: 24rpx;
}

.error-text {
  color: var(--ev-negative);
}

.retry-btn {
  padding: 16rpx 48rpx;
  border-radius: 9999rpx;
  background: var(--ev-accent-soft);
  border: 1px solid var(--ev-accent);
}

.retry-text {
  font-size: 26rpx;
  color: var(--ev-accent);
  font-weight: 500;
}

.load-more-area {
  padding: 32rpx;
  display: flex;
  justify-content: center;
}

.load-more-btn {
  padding: 20rpx 56rpx;
  border-radius: 9999rpx;
  background: var(--ev-accent-soft);
  border: 1px solid var(--ev-border);
}

.load-more-btn:active {
  background: var(--ev-accent-bg);
}

.load-more-text {
  font-size: 26rpx;
  color: var(--ev-accent);
  font-weight: 500;
}

.done-text {
  color: var(--ev-text-muted);
}
</style>
