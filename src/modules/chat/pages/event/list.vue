<template>
  <SubPageCard title="事件传导">
    <view class="event-list-content">
      <!-- Global Importance 双榜单 -->
      <view v-if="focusEvents.length > 0" class="focus-section">
        <view class="focus-cards">
          <view
            v-for="evt in focusEvents"
            :key="evt.eventId"
            class="focus-card-wrapper"
          >
            <text class="card-title">
              {{ evt.type === 'current_focus' ? '当前焦点事件' : '重大持续事件' }}
            </text>
            <EventHeadlineCard
              :type="evt.direction"
              :title="evt.title"
              :importance="evt.importance"
              :industries="evt.industries"
              :event-id="evt.eventId"
              @click="handleHeadlineClick"
            />
          </view>
        </view>
      </view>

      <!-- 分类Tab -->
      <EventTabBar :active="activeType" @change="handleFilterChange" />

      <!-- 加载中 -->
      <view v-if="loading && events.length === 0" class="state-container">
        <text class="state-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="isEmpty" class="state-container">
        <SvgIcon name="inbox-line" size="64rpx" color="#9ca3af" />
        <text class="state-text">暂无事件数据</text>
        <view class="retry-btn" @tap="refresh">
          <text class="retry-text">点击刷新</text>
        </view>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="error" class="state-container">
        <SvgIcon name="error-warning-line" size="64rpx" color="#ef4444" />
        <text class="state-text error-text">{{ error }}</text>
        <view class="retry-btn" @tap="refresh">
          <text class="retry-text">重试</text>
        </view>
      </view>

      <!-- 事件列表 -->
      <template v-else>
        <view class="event-list">
          <EventItemCard
            v-for="event in events"
            :key="event.eventId"
            :event="event"
            @view-detail="goToDetail"
            @view-news="goToNews"
            @toggle-follow="handleFollow"
          />
        </view>

        <!-- 加载更多 -->
        <view class="load-more-area">
          <view v-if="loading" class="load-more-btn">
            <text class="load-more-text">加载中...</text>
          </view>
          <view v-else-if="hasMore" class="load-more-btn" @tap="loadMore">
            <text class="load-more-text">加载更多 ({{ total - events.length }} 条)</text>
          </view>
          <view v-else-if="events.length > 0" class="load-more-btn">
            <text class="load-more-text done-text">— 已加载全部 {{ total }} 条事件 —</text>
          </view>
        </view>
      </template>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
/**
 * 事件传导 — 子页面
 *
 * 从早点听卡片入口进入，展示 AI 事件影响链分析。
 * 支持分类筛选、分页加载、关注事件。
 */
import { onMounted, ref } from 'vue'
import type { EventItem, FocusEventViewModel } from '@/modules/chat/event/types'
import { useEventList } from '@/modules/chat/event/composables/useEventList'
import { useEventFollow } from '@/modules/chat/event/composables/useEventFollow'
import { getFocusEvents } from '@/modules/chat/event/api/eventService'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import EventTabBar from '@/modules/chat/event/components/EventTabBar.vue'
import EventItemCard from '@/modules/chat/event/components/EventItemCard.vue'
import EventHeadlineCard from '@/modules/chat/event/components/EventHeadlineCard.vue'

// ========== Global Importance 双榜单（焦点事件） ==========

const focusEvents = ref<FocusEventViewModel[]>([])

/**
 * 加载 Global Importance 双榜单
 *
 * 数据流：
 *   getFocusEvents() → FocusEventViewModel[]
 *   → v-for 渲染两个 EventHeadlineCard
 *
 * 异常处理：
 *   - GI 无数据 → 返回 []，不展示任何卡片
 *   - 详情查询失败 → 保留 GI 基础字段（eventId/direction/importance）
 *   - 网络异常 → catch 返回 []，不影响下方事件列表
 */
async function loadHeadlineEvents() {
  focusEvents.value = await getFocusEvents()
}

// ========== Composables ==========
const {
  events,
  loading,
  error,
  total,
  hasMore,
  isEmpty,
  activeType,
  refresh,
  loadMore,
  setEventType,
  updateFollowStatus,
} = useEventList()

const { toggleFollow } = useEventFollow()

// ========== 生命周期 ==========
onMounted(() => {
  refresh()
  loadHeadlineEvents()
})

// ========== 事件处理 ==========

/** AI 今日精选卡片点击 - 跳转到事件详情页 */
function handleHeadlineClick(eventId: string) {
  uni.navigateTo({
    url: `/modules/chat/pages/event/detail?id=${eventId}`
  })
}

/** 事件类型筛选切换 */
function handleFilterChange(value: string) {
  setEventType(value)
}

/** 跳转详情 */
function goToDetail(event: EventItem) {
  uni.navigateTo({
    url: `/modules/chat/pages/event/detail?id=${event.eventId}`,
  })
}

/** 跳转新闻原文 */
function goToNews(event: EventItem) {
  const newsId = event.newsId
  if (newsId) {
    uni.navigateTo({ url: `/modules/news/pages/detail?id=${newsId}&eventId=${event.eventId}` })
  }
}

/** 关注/取消关注 */
async function handleFollow(event: EventItem) {
  const success = await toggleFollow(event.eventId, event.isFollowed)
  if (success) {
    updateFollowStatus(event.eventId, !event.isFollowed)
  }
}
</script>

<style scoped>
.event-list-content {
  padding: 0 32rpx 40rpx;
}

/* ========== Global Importance 双榜单 ========== */
.focus-section {
  margin-bottom: 20rpx;
}

.focus-cards {
  display: flex;
  flex-direction: row;
  gap: 20rpx;
  align-items: stretch;
  width: 100%;
}

.focus-card-wrapper {
  flex: 1;
  width: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.card-title {
  font-size: 22rpx;
  font-weight: 700;
  color: #6B7280;
  line-height: 1.3;
  white-space: nowrap;
  text-align: center;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 32rpx;
}

.state-icon {
  font-size: 64rpx;
  margin-bottom: 24rpx;
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
