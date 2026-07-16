<template>
  <view class="news-detail-page">
    <!-- 加载中 -->
    <view v-if="loading" class="state-container">
      <text class="state-text">加载中...</text>
    </view>

    <!-- 新闻内容 -->
    <template v-else-if="detail">
      <scroll-view scroll-y class="news-scroll" :enhanced="true" :bounces="false" :style="{ height: scrollHeight + 'px' }">
        <view class="news-content">
          <view class="news-header">
            <text class="news-title">{{ detail.title }}</text>
            <view class="news-meta">
              <text class="news-source">{{ detail.source }}</text>
              <text class="meta-dot">·</text>
              <text class="news-time">{{ detail.publishTime }}</text>
            </view>
          </view>

          <view v-if="detail.summary" class="news-summary">
            <text class="summary-text">{{ detail.summary }}</text>
          </view>

          <view class="news-body">
            <rich-text :nodes="formattedContent" />
          </view>

          <view v-if="detail.url" class="news-footer">
            <text class="footer-link" @tap="openOriginal">查看原文 ›</text>
          </view>

          <view v-if="relatedEventId" class="news-event-footer">
            <view class="event-btn" @tap="goToEventDetail">
              <text class="event-btn-text">查看关联事件详情 ›</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </template>

    <!-- 加载失败 / 空状态 -->
    <view v-else class="state-container">
      <text class="state-text">暂无资讯详情</text>
    </view>

    <!-- 全局AI对话栏 -->
    <GlobalChatBar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'

const loading = ref(false)
const detail = ref<{
  id: string
  title: string
  content: string
  summary: string
  publishTime: string
  url: string
  source: string
} | null>(null)

const relatedEventId = ref('')

const formattedContent = computed(() => {
  if (!detail.value?.content) return ''
  const text = detail.value.content
  return text.split(/\n+/).map(p => `<p style="margin:0 0 16rpx 0;line-height:1.8;font-size:28rpx;color:#374151;">${p}</p>`).join('')
})

// 动态计算 scroll-view 高度
const windowHeight = ref(0)
try {
  const sysInfo = uni.getSystemInfoSync()
  windowHeight.value = sysInfo.windowHeight || 667
} catch (e) {
  windowHeight.value = 667
}
// 系统导航栏页面：windowHeight 已排除导航栏区域
const scrollHeight = computed(() => windowHeight.value)

onLoad((options) => {
  const newsId = options?.id || ''
  relatedEventId.value = options?.eventId || ''
  if (newsId) {
    loadDetail(newsId)
  } else {
    loadMockDetail()
  }
})

async function loadDetail(id: string) {
  loading.value = true
  try {
    detail.value = await stockApi.getNewsDetail(id)
  } catch {
    loadMockDetail()
  } finally {
    loading.value = false
  }
}

function loadMockDetail() {
  detail.value = {
    id: 'mock-1',
    title: '动力煤需求阶段性回落，旺季预期仍存',
    content: '近日，动力煤市场价格出现阶段性回落。受气温回升、工业用电需求放缓等因素影响，港口煤价连续三日下调。\n\n不过，市场对旺季预期仍然较强。分析人士指出，夏季用电高峰即将来临，电厂日耗有望回升，叠加进口煤政策收紧预期，动力煤价格在短暂调整后仍有支撑。',
    summary: '动力煤价格阶段性回落，但夏季用电高峰预期仍存，中期偏强格局未改。',
    publishTime: '2026-06-30 14:30',
    url: '',
    source: '财联社'
  }
}

function openOriginal() {
  if (detail.value?.url) {
    // #ifdef H5
    window.open(detail.value.url, '_blank')
    // #endif
    // #ifndef H5
    uni.navigateTo({ url: `/pages-sub-app/webview/index?url=${encodeURIComponent(detail.value.url)}` })
    // #endif
  }
}

function goToEventDetail() {
  if (relatedEventId.value) {
    uni.navigateTo({ url: `/modules/chat/pages/event/detail?id=${relatedEventId.value}` })
  }
}
</script>

<style scoped>
/* 系统导航栏页面：不需要 position:fixed，disableScroll 已在 pages.json 中配置 */
.news-detail-page {
  min-height: 100vh;
  background: #ffffff;
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 300rpx 0;
}
.state-text { font-size: 28rpx; color: #6b7280; }

/* Scroll */
.news-scroll {
  min-height: 0;
  touch-action: auto;
  overscroll-behavior: contain;
}

.news-content {
  padding: 16rpx 32rpx 40rpx;
}

.news-header {
  margin-bottom: 28rpx;
}

.news-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1d24;
  line-height: 1.5;
  display: block;
  margin-bottom: 16rpx;
}

.news-meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.news-source {
  font-size: 22rpx;
  color: #4d7cfe;
  font-weight: 500;
  background: rgba(77, 124, 254, 0.08);
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}
.meta-dot { font-size: 22rpx; color: #9ca3af; }
.news-time {
  font-size: 22rpx;
  color: #9ca3af;
}

.news-summary {
  background: #f8fafc;
  border-left: 6rpx solid #4d7cfe;
  padding: 20rpx 24rpx;
  border-radius: 0 12rpx 12rpx 0;
  margin-bottom: 28rpx;
}

.summary-text {
  font-size: 26rpx;
  color: #374151;
  line-height: 1.7;
}

.news-body {
  line-height: 1.8;
}

.news-footer {
  margin-top: 40rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f0f2f5;
  text-align: center;
}

.footer-link {
  font-size: 28rpx;
  color: #4d7cfe;
  font-weight: 500;
}

.news-event-footer {
  margin-top: 32rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f0f2f5;
  display: flex;
  justify-content: center;
}

.event-btn {
  padding: 16rpx 40rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}

.event-btn-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
}
</style>
