<template>
  <view class="news-detail-page">
    <!-- 加载中 -->
    <LoadingState v-if="loading" />

    <!-- 新闻内容 -->
    <template v-else-if="detail">
      <scroll-view scroll-y class="news-scroll" :enhanced="true" :bounces="false" :style="{ height: scrollHeight + 'px' }">
        <view class="news-content">
          <view class="news-header">
            <text class="news-title">{{ detail.title }}</text>
            <view class="news-meta">
              <Tag size="sm">{{ detail.source }}</Tag>
              <text class="meta-dot">·</text>
              <text class="news-time">{{ detail.publishTime }}</text>
            </view>
          </view>

          <!-- AI深度解析入口 -->
          <Card v-if="relatedEventId" clickable class="ai-analysis-entry" @click="goToEventDetail">
            <view class="ai-entry-icon">
              <SvgIcon name="robot-line" size="32rpx" color="#0b5fff" />
            </view>
            <view class="ai-entry-content">
              <text class="ai-entry-title">AI深度解析</text>
              <text class="ai-entry-subtitle">查看事件影响链与产业机会</text>
            </view>
            <SvgIcon name="arrow-right-s-line" size="36rpx" color="#8a96b0" />
          </Card>

          <Card v-if="detail.summary" class="news-summary">
            <text class="summary-text">{{ detail.summary }}</text>
          </Card>

          <view class="news-body">
            <rich-text :nodes="formattedContent" />
          </view>

          <view v-if="detail.url" class="news-footer">
            <text class="footer-link" @tap="openOriginal">查看原文 ›</text>
          </view>
        </view>
      </scroll-view>
    </template>

    <!-- 加载失败 / 空状态 -->
    <EmptyState v-else title="暂无资讯详情" />

    <!-- 全局AI对话栏 -->
    <GlobalChatBar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { LoadingState, EmptyState, Tag, Card } from '@/shared/components'

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

<style scoped lang="scss">
/* 系统导航栏页面：不需要 position:fixed，disableScroll 已在 pages.json 中配置 */
.news-detail-page {
  min-height: 100vh;
  background: $bg-card;
}

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
  color: $ink;
  line-height: 1.5;
  display: block;
  margin-bottom: 16rpx;
}

.news-meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.meta-dot { font-size: 22rpx; color: $ink-mute; }
.news-time {
  font-size: 22rpx;
  color: $ink-mute;
}

.news-summary {
  background: $bg-soft;
  border-left: 6rpx solid $primary;
  margin-bottom: 28rpx;
}

.summary-text {
  font-size: 26rpx;
  color: $ink-soft;
  line-height: 1.7;
}

.news-body {
  line-height: 1.8;
}

.news-footer {
  margin-top: 40rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid $line-soft;
  text-align: center;
}

.footer-link {
  font-size: 28rpx;
  color: $primary;
  font-weight: 500;
}

/* AI 深度解析入口：遵循 Card 的白底、细边框与品牌蓝强调。 */
.ai-analysis-entry {
  margin: 28rpx 0;
  background: $bg-card;
  border-color: $line;
}
.ai-analysis-entry :deep(.as-card__body) {
  display: flex;
  align-items: center;
}

.ai-entry-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: $r-sm;
  background: $primary-50;
}

.ai-entry-content {
  flex: 1;
  margin-left: 20rpx;
}

.ai-entry-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
}

.ai-entry-subtitle {
  display: block;
  font-size: 22rpx;
  color: $ink-soft;
  margin-top: 4rpx;
}

</style>
