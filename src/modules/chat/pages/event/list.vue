<template>
  <view class="event-list-page">
    <!-- 固定头部区域：返回按钮 + 标题 + 副标题 + 分类Tab -->
    <view class="event-header">
      <view class="page-header">
        <view class="header-top">
          <view class="back-btn" @tap="goBack">
            <text class="back-arrow">←</text>
            <text class="back-text">返回</text>
          </view>
        </view>
        <text class="page-title">事件传导</text>
        <text class="page-subtitle">AI解析事件影响链，追踪产业链机会</text>
      </view>
      <EventTabBar :active="activeType" @change="handleFilterChange" />
    </view>

    <!-- 独立滚动的事件流区域 -->
    <scroll-view class="event-stream" scroll-y="true" :show-scrollbar="true" :enhanced="true" :bounces="false">
      <!-- 加载中 -->
      <view v-if="loading && events.length === 0" class="state-container">
        <text class="state-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="isEmpty" class="state-container">
        <text class="state-icon">📭</text>
        <text class="state-text">暂无事件数据</text>
        <view class="retry-btn" @tap="refresh">
          <text class="retry-text">点击刷新</text>
        </view>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="error" class="state-container">
        <text class="state-icon">⚠</text>
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
    </scroll-view>

    <!-- 底部区域：AppBottomBar + GlobalChatBar（两者均为 position:fixed，此处仅为 flex 占位） -->
    <view class="event-footer">
      <view class="event-bottom-wrapper">
        <AppBottomBar current-tab="event" />
      </view>
      <view class="event-chatbar-wrapper">
        <GlobalChatBar />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 事件传导 — 一级页面
 *
 * 底部 Tab 直达，展示 AI 事件影响链分析。
 * 支持分类筛选、分页加载、关注事件。
 */
import { onMounted } from 'vue'
import type { EventItem } from '@/modules/chat/event/types'
import { useEventList } from '@/modules/chat/event/composables/useEventList'
import { useEventFollow } from '@/modules/chat/event/composables/useEventFollow'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'
import AppBottomBar from '@/shared/components/AppBottomBar.vue'
import EventTabBar from '@/modules/chat/event/components/EventTabBar.vue'
import EventItemCard from '@/modules/chat/event/components/EventItemCard.vue'

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

/** 返回上一页 */
function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.navigateTo({ url: '/modules/home/pages/index' })
  }
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
    uni.navigateTo({ url: `/modules/chat/pages/news/detail?id=${newsId}` })
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
.event-list-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--ev-bg-page);
}

/* ===== 固定头部区域 ===== */
.event-header {
  flex-shrink: 0;
  z-index: 10;
  background: var(--ev-bg-page);
}

/* ===== 页面标题区 ===== */
.page-header {
  padding: 28rpx 32rpx 20rpx;
}

.header-top {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 20rpx 8rpx 12rpx;
  border-radius: 9999rpx;
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.12);
  transition: all 0.2s;
}

.back-btn:active {
  background: rgba(148, 163, 184, 0.15);
}

.back-arrow {
  font-size: 28rpx;
  color: var(--ev-text-tertiary);
  line-height: 1;
}

.back-text {
  font-size: 24rpx;
  color: var(--ev-text-tertiary);
}

.page-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: var(--ev-text-primary);
  margin-bottom: 8rpx;
}

.page-subtitle {
  display: block;
  font-size: 24rpx;
  color: var(--ev-text-muted);
  line-height: 1.5;
}

/* ===== 独立滚动事件流 ===== */
.event-stream {
  flex: 1;
  overflow: hidden;
}

/* 事件流内容区域：底部留白防遮挡 */
.event-list {
  padding: 16rpx 32rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* H5 端自定义滚动条样式 */
/* 轨道宽度 3px，滑块圆角，暗色主题 */
.event-stream::-webkit-scrollbar {
  width: 3px;
}

.event-stream::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.event-stream::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.25);
  border-radius: 4px;
}

.event-stream::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
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
  color: #F43F5E;
}

.retry-btn {
  padding: 16rpx 48rpx;
  border-radius: 9999rpx;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.retry-text {
  font-size: 26rpx;
  color: #60A5FA;
  font-weight: 500;
}

/* 加载更多 */
.load-more-area {
  padding: 32rpx;
  display: flex;
  justify-content: center;
}

.load-more-btn {
  padding: 20rpx 56rpx;
  border-radius: 9999rpx;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.15);
}

.load-more-btn:active {
  background: rgba(59, 130, 246, 0.15);
}

.load-more-text {
  font-size: 26rpx;
  color: #60A5FA;
  font-weight: 500;
}

.done-text {
  color: var(--ev-text-muted);
}

/* ===== 底部区域 ===== */
/* AppBottomBar / GlobalChatBar 均为 position:fixed，此处仅提供 flex 占位高度 */
.event-footer {
  flex-shrink: 0;
  z-index: 10;
  height: 210rpx;
}

/* 深色主题覆盖：AppBottomBar 默认 #f5f7fb → #161A26 */
.event-bottom-wrapper :deep(.as-tab-bar) {
  background: #161A26;
}

/* 深色主题覆盖：GlobalChatBar 整体背景 #f5f7fb → #161A26 */
.event-chatbar-wrapper :deep(.global-chat-bar) {
  background: #161A26;
}

/* 深色主题覆盖：GlobalChatBar 白色按钮 → 暗色 */
.event-chatbar-wrapper :deep(.gcb-side-btn) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(148, 163, 184, 0.12);
}

/* 深色主题覆盖：GlobalChatBar 白色输入框 → 暗色 */
.event-chatbar-wrapper :deep(.gcb-chat-input) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(148, 163, 184, 0.12);
}

/* 深色主题覆盖：按钮文字 / 占位文字适配暗色背景 */
.event-chatbar-wrapper :deep(.gcb-side-text) {
  color: var(--ev-text-tertiary);
}

.event-chatbar-wrapper :deep(.gcb-chat-placeholder) {
  color: var(--ev-text-muted);
}
</style>
