<template>
  <view class="article-page">
    <!-- 自绘返回导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" hover-class="nav-back--hover" @click="goBack">
        <text class="nav-back-arrow">‹</text>
        <text class="nav-back-text">返回</text>
      </view>
      <text class="nav-title">原文详情</text>
      <view class="nav-right" />
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="state-container">
      <text class="state-text">加载中...</text>
    </view>

    <!-- 加载失败（无原文 / 正文获取失败等），友好提示 -->
    <view v-else-if="error" class="state-container">
      <view class="state-icon">!</view>
      <text class="state-text">{{ error }}</text>
      <view class="retry-btn" hover-class="retry-btn--hover" @click="loadArticle">
        <text class="retry-text">重试</text>
      </view>
    </view>

    <!-- 正文 -->
    <scroll-view v-else class="article-scroll" scroll-y>
      <view class="article-body">
        <text class="article-title">{{ article?.title }}</text>
        <view class="article-meta">
          <text class="article-source">{{ article?.source }}</text>
          <text class="article-time">{{ formatDateTime(article?.publishTime) }}</text>
        </view>
        <view class="article-divider" />
        <text v-if="article?.content" class="article-content" selectable>{{ article?.content }}</text>
        <view v-else class="article-empty">
          <text class="article-empty-text">暂无原文内容</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * event-article/index - 事件原文详情页（APP 内展示，不依赖 web-view）
 *
 * 功能：接收 eventId，调用 GET /api/agent/event/:eventId/article 拉取财联社正文，
 * 在应用内纯文本渲染。替代"打开外部网页"的 WebView 方案，保持 APP/H5 统一进入本页。
 *
 * 异常降级：无原文链接 / 非财联社来源 / 正文获取失败 → 展示友好提示，不跳外部网页。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getEventArticle } from '@/modules/chat/event/api/eventApi'
import { formatDateTime } from '@/shared/utils/datetime'
import type { EventArticle } from '@/modules/chat/event/types'

/** 当前 eventId */
const eventId = ref('')

/** 原文数据 */
const article = ref<EventArticle | null>(null)

/** 加载中 */
const loading = ref(false)

/** 错误信息（加载失败），空表示无错误 */
const error = ref('')

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/modules/chat/pages/index' })
  }
}

async function loadArticle() {
  if (!eventId.value) {
    error.value = '缺少事件参数'
    return
  }
  loading.value = true
  error.value = ''
  try {
    article.value = await getEventArticle(eventId.value)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '原文获取失败，请稍后重试'
    error.value = msg || '原文获取失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onLoad((query) => {
  const eventIdParam = (query as Record<string, string> | undefined)?.eventId ?? ''
  if (!eventIdParam) {
    error.value = '缺少事件参数'
    return
  }
  eventId.value = eventIdParam
  loadArticle()
})
</script>

<style lang="scss" scoped>
.article-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f6f8;
}

.nav-bar {
  flex-shrink: 0;
  height: 88rpx;
  padding: 0 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  background: #ffffff;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
}

.nav-back {
  display: flex;
  align-items: center;
  padding: 12rpx;
  margin-left: -12rpx;
  color: #333;

  &--hover {
    opacity: 0.6;
  }
}

.nav-back-arrow {
  font-size: 36rpx;
  line-height: 1;
  margin-right: 4rpx;
}

.nav-back-text {
  font-size: 28rpx;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #1f2329;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 12rpx;
}

.nav-right {
  width: 88rpx;
}

.state-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 80rpx 48rpx;
  color: #8a9099;
}

.state-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #eef0f3;
  color: #8a9099;
  font-size: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-text {
  font-size: 28rpx;
  text-align: center;
  line-height: 1.6;
  color: #8a9099;
}

.retry-btn {
  margin-top: 8rpx;
  padding: 12rpx 48rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 1rpx solid #d8dce1;
  color: #1f2329;
  font-size: 28rpx;

  &--hover {
    background: #f0f1f3;
  }
}

.retry-text {
  font-size: 28rpx;
  color: #1f2329;
}

/* 正文滚动区 */
.article-scroll {
  flex: 1;
  width: 100%;
}

.article-body {
  background: #ffffff;
  margin: 16rpx;
  border-radius: 16rpx;
  padding: 32rpx 28rpx;
  box-sizing: border-box;
}

.article-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.5;
  word-break: break-word;
}

.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 16rpx;
}

.article-source {
  font-size: 24rpx;
  color: #8a9099;
}

.article-time {
  font-size: 24rpx;
  color: #8a9099;
}

.article-divider {
  height: 1px;
  background: #f0f1f3;
  margin: 24rpx 0;
}

.article-content {
  display: block;
  font-size: 30rpx;
  color: #2b2f36;
  line-height: 1.8;
  /* 长文本自动换行；图片/超长内容不撑破屏幕 */
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  max-width: 100%;
}

/* 无正文降级展示 */
.article-empty {
  padding: 48rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.article-empty-text {
  font-size: 28rpx;
  color: #8a9099;
}
</style>