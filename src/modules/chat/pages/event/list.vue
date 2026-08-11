<template>
  <SubPageCard title="事件传导">
    <view class="event-list-content">
      <!-- AI关注焦点区域 -->
      <view v-if="focusEvents.length > 0" class="ai-focus-section">
        <text class="section-title">重大事件</text>
        <!-- 固定左利好/右利空；单一时单卡全宽，不保留空白卡位 -->
        <view :class="headlineCount === 1 ? 'headline-single' : 'headline-cards'">
          <EventHeadlineCard
            v-if="positiveEvent"
            type="positive"
            :title="positiveEvent.title"
            :importance="positiveEvent.importance"
            :industries="positiveEvent.affectedIndustries ?? []"
            :event-id="positiveEvent.eventId"
            @click="handleHeadlineClick"
          />
          <EventHeadlineCard
            v-if="negativeEvent"
            type="negative"
            :title="negativeEvent.title"
            :importance="negativeEvent.importance"
            :industries="negativeEvent.affectedIndustries ?? []"
            :event-id="negativeEvent.eventId"
            @click="handleHeadlineClick"
          />
        </view>
      </view>

      <!-- 分类Tab -->
      <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
        <Segmented :modelValue="activeType" :items="tabItems" @change="(v: string | number) => handleFilterChange(String(v))" />
      </scroll-view>

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
            <text class="load-more-text">加载更多</text>
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
import { computed, onMounted, ref } from 'vue'
import type { EventItem } from '@/modules/chat/event/types'
import type { FocusEventViewModel } from '@/modules/chat/event/types'
import { useEventList } from '@/modules/chat/event/composables/useEventList'
import { useEventFollow } from '@/modules/chat/event/composables/useEventFollow'
import { getFocusEvents } from '@/modules/chat/event/api/eventService'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import Segmented from '@/shared/components/Segmented.vue'
import EventItemCard from '@/modules/chat/event/components/EventItemCard.vue'
import EventHeadlineCard from '@/modules/chat/event/components/EventHeadlineCard.vue'
import { EVENT_TYPES } from '@/modules/chat/event/constants'

// ========== 分类 Tab 项（全部 + 事件类型，对齐 Segmented items 格式） ==========
const tabItems = [{ label: '全部', value: '全部' }, ...EVENT_TYPES.map(v => ({ label: v, value: v }))]

// ========== 重大事件（基于 Global Importance 排序，由 eventService 提供） ==========
const focusEvents = ref<FocusEventViewModel[]>([])

/** 左卡 = 利好事件（positive），右卡 = 利空事件（negative）；忽略 mixed */
const positiveEvent = computed(() => focusEvents.value.find(e => e.direction === 'positive') ?? null)
const negativeEvent = computed(() => focusEvents.value.find(e => e.direction === 'negative') ?? null)

/** 重大事件卡片数量（0/1/2），驱动单卡全宽 / 双卡布局 */
const headlineCount = computed(() => (positiveEvent.value ? 1 : 0) + (negativeEvent.value ? 1 : 0))

/**
 * 加载重大事件：调用 getFocusEvents() 获取 rank=1（当前焦点）和 rank=2（持续影响）的事件
 * 数据流（第三阶段）：getEventList（直出 chain_summary）→ adapter 生成 affectedIndustries → getFocusEvents 直接消费，不再请求详情
 */
async function loadFocusEvents() {
  try {
    focusEvents.value = await getFocusEvents()
  } catch (error) {
    console.error('加载重大事件失败:', error)
  }
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
  loadFocusEvents()
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

/* 分类 Tab 滚动容器（Segmented 不自带横向滚动，7 个分类需滚动） */
.tab-scroll {
  width: 100%;
  white-space: nowrap;
  padding: 16rpx 0 8rpx;
}

.tab-scroll :deep(.as-segmented) {
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
}

.tab-scroll :deep(.as-segmented__item) {
  flex-shrink: 0;
  white-space: nowrap;
}

/* ========== AI 关注焦点区域 ========== */
.ai-focus-section {
  margin-bottom: 20rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 10rpx;
  letter-spacing: 0.5rpx;
}

.headline-cards {
  display: flex;
  flex-direction: row;
  gap: 8rpx;
  align-items: stretch;
}

/* 单个重大事件：单卡占满内容宽度（EventHeadlineCard 根节点 flex:1 自动填充） */
.headline-single {
  display: flex;
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
