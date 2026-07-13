<template>
  <view class="news-detail-page">
    <!-- 加载 -->
    <view v-if="loading" class="state-container">
      <text class="state-text">加载中...</text>
    </view>

    <!-- 错误 -->
    <view v-else-if="error" class="state-container">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="handleRetry">
        <text class="retry-text">重试</text>
      </view>
    </view>

    <!-- 内容 -->
    <template v-else-if="news">
      <!-- 返回 -->
      <view class="news-header">
        <view class="back-btn" @tap="goBack">
          <text class="back-arrow">←</text>
          <text class="back-text">返回</text>
        </view>
      </view>

      <!-- 标题 -->
      <text class="news-title">{{ news.title }}</text>

      <!-- 来源 + 时间 -->
      <view class="news-meta">
        <text class="news-source">{{ news.source }}</text>
        <text class="meta-dot">·</text>
        <text class="news-time">{{ news.publishTime }}</text>
      </view>

      <!-- 正文 -->
      <view class="news-body">
        <text class="news-content">{{ news.content }}</text>
      </view>

      <!-- 返回事件 -->
      <view class="news-footer">
        <view class="back-event-btn" @tap="goToEvent">
          <text class="back-event-text">查看关联事件详情 ›</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useNewsDetail } from '@/modules/chat/event/composables/useNewsDetail'

const { news, loading, error, fetchNews } = useNewsDetail()
const newsId = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  // @ts-ignore
  newsId.value = currentPage?.options?.id || currentPage?.$page?.options?.id || ''
  if (newsId.value) fetchNews(newsId.value)
})

function handleRetry() {
  if (newsId.value) fetchNews(newsId.value)
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.navigateTo({ url: '/modules/chat/pages/event/list' })
  }
}

function goToEvent() {
  if (news.value?.relatedEventId) {
    uni.navigateTo({ url: `/modules/chat/pages/event/detail?id=${news.value.relatedEventId}` })
  }
}
</script>

<style scoped>
.news-detail-page {
  min-height: 100vh;
  background: var(--ev-bg-page);
  padding: 24rpx 32rpx 80rpx;
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 300rpx 0;
}
.state-text { font-size: 28rpx; color: var(--ev-text-muted); }
.error-text { font-size: 28rpx; color: var(--ev-negative); margin-bottom: 24rpx; }
.retry-btn {
  padding: 16rpx 48rpx; border-radius: 9999rpx;
  background: var(--ev-accent-soft); border: 1px solid var(--ev-accent);
}
.retry-text { font-size: 26rpx; color: var(--ev-accent); font-weight: 500; }

/* Header */
.news-header {
  margin-bottom: 24rpx;
}
.back-btn {
  display: inline-flex; align-items: center; gap: 6rpx;
  padding: 8rpx 20rpx 8rpx 12rpx; border-radius: 9999rpx;
  background: var(--ev-bg-card-muted); border: 1px solid var(--ev-border);
}
.back-arrow { font-size: 28rpx; color: var(--ev-text-tertiary); }
.back-text { font-size: 24rpx; color: var(--ev-text-tertiary); }

/* Title */
.news-title {
  display: block;
  font-size: 34rpx; font-weight: 700; color: var(--ev-text-primary);
  line-height: 1.45; margin-bottom: 16rpx;
}

/* Meta */
.news-meta {
  display: flex; align-items: center; gap: 10rpx;
  margin-bottom: 32rpx; padding-bottom: 24rpx;
  border-bottom: 1px solid var(--ev-border);
}
.news-source { font-size: 22rpx; color: var(--ev-accent); font-weight: 500; }
.meta-dot { font-size: 22rpx; color: var(--ev-text-muted); }
.news-time { font-size: 22rpx; color: var(--ev-text-muted); }

/* Body */
.news-body {
  margin-bottom: 40rpx;
}
.news-content {
  font-size: 28rpx; color: var(--ev-text-secondary); line-height: 1.85;
  white-space: pre-wrap;
}

/* Footer */
.news-footer {
  display: flex; justify-content: center;
  padding-top: 32rpx; border-top: 1px solid var(--ev-border-light);
}
.back-event-btn {
  padding: 16rpx 40rpx; border-radius: 9999rpx;
  background: var(--ev-blue-gradient);
  box-shadow: 0 2rpx 12rpx var(--ev-blue-shadow);
}
.back-event-text { font-size: 26rpx; color: #FFFFFF; font-weight: 500; }
</style>
