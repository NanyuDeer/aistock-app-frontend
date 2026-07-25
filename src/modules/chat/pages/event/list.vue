<template>
  <SubPageCard title="事件传导">
    <view class="event-list-content">
      <!-- AI关注焦点区域 -->
      <view class="ai-focus-section">
        <text class="section-title">焦点事件</text>
        <view class="headline-cards">
          <EventHeadlineCard
            v-if="mockHeadlineEvents.positive"
            type="positive"
            :title="mockHeadlineEvents.positive.title"
            :importance="mockHeadlineEvents.positive.importance"
            :industries="mockHeadlineEvents.positive.industries"
            :event-id="mockHeadlineEvents.positive.eventId"
            @click="handleHeadlineClick"
          />
          <EventHeadlineCard
            v-if="mockHeadlineEvents.negative"
            type="negative"
            :title="mockHeadlineEvents.negative.title"
            :importance="mockHeadlineEvents.negative.importance"
            :industries="mockHeadlineEvents.negative.industries"
            :event-id="mockHeadlineEvents.negative.eventId"
            @click="handleHeadlineClick"
          />
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
import { onMounted, reactive } from 'vue'
import type { EventItem } from '@/modules/chat/event/types'
import { useEventList } from '@/modules/chat/event/composables/useEventList'
import { useEventFollow } from '@/modules/chat/event/composables/useEventFollow'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import EventTabBar from '@/modules/chat/event/components/EventTabBar.vue'
import EventItemCard from '@/modules/chat/event/components/EventItemCard.vue'
import EventHeadlineCard from '@/modules/chat/event/components/EventHeadlineCard.vue'

// ========== Mock 数据（AI 关注焦点） ==========
const mockHeadlineEvents = reactive({
  positive: {
    eventId: 'event-ai-computing-power',
    newsId: 'news-ai-computing-power',
    title: 'AI服务器需求持续增长，算力基础设施扩容确定性强',
    importance: 'major' as const,
    industries: ['算力', '芯片', '软件']
  },
  negative: {
    eventId: 'event-real-estate',
    newsId: 'news-real-estate',
    title: '地产调控政策持续收紧，销售数据环比下滑',
    importance: 'major' as const,
    industries: ['房地产', '建材', '家居']
  }
})

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
})

// ========== 事件处理 ==========

/** AI 今日精选卡片点击 - 跳转到新闻详情页（事件原文） */
function handleHeadlineClick(eventId: string) {
  // 查找对应的 newsId
  let newsId = ''
  if (mockHeadlineEvents.positive?.eventId === eventId) {
    newsId = mockHeadlineEvents.positive.newsId
  } else if (mockHeadlineEvents.negative?.eventId === eventId) {
    newsId = mockHeadlineEvents.negative.newsId
  }

  // 跳转到新闻详情页（事件原文）
  uni.navigateTo({
    url: `/modules/news/pages/detail?id=${newsId}&eventId=${eventId}`
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
  gap: 12rpx;
  align-items: stretch;
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
