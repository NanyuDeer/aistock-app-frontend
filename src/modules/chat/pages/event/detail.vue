<template>
  <view class="event-detail-page">
    <!-- ===== 加载状态 ===== -->
    <template v-if="loading">
      <view class="state-container">
        <text class="state-text">加载中...</text>
      </view>
    </template>

    <!-- ===== 错误状态 ===== -->
    <template v-else-if="error">
      <view class="state-container">
        <text class="state-icon">⚠</text>
        <text class="state-text error-text">{{ error }}</text>
        <view class="retry-btn" @tap="handleRetry">
          <text class="retry-text">重试</text>
        </view>
      </view>
    </template>

    <!-- ===== AI 事件分析报告 ===== -->
    <AiEventReport v-else-if="detail" :detail="detail" @back="goBack" />
  </view>
</template>

<script setup lang="ts">
/**
 * 事件详情页
 *
 * 职责：获取事件ID → 获取基础信息 → 调用 AiEventReport 展示 AI 分析报告。
 * 不再直接管理分析模块，统一由 AiEventReport 控制分析流程。
 */
import { onMounted, ref } from 'vue'
import { useEventDetail } from '@/modules/chat/event/composables/useEventDetail'
import AiEventReport from '@/modules/chat/event/components/AiEventReport.vue'

// ========== Composable ==========
const { detail, loading, error, fetchDetail } = useEventDetail()

// ========== 本地状态 ==========
const eventId = ref('')

// ========== 生命周期 ==========
onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  // @ts-ignore uni-app 路由参数
  eventId.value = currentPage?.options?.id || currentPage?.$page?.options?.id || ''
  if (eventId.value) {
    fetchDetail(eventId.value)
  }
})

/** 重试 */
function handleRetry() {
  if (eventId.value) fetchDetail(eventId.value)
}

/** 返回上一页（优先返回事件列表） */
function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.navigateTo({ url: '/modules/chat/pages/event/list' })
  }
}
</script>

<style scoped>
.event-detail-page {
  min-height: 100vh;
  background: var(--ev-bg-page);
}

/* 状态 */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 300rpx 32rpx;
}

.state-icon { font-size: 64rpx; margin-bottom: 24rpx; }
.state-text { font-size: 28rpx; color: var(--ev-text-muted); margin-bottom: 24rpx; }

.retry-btn {
  padding: 16rpx 48rpx;
  border-radius: 9999rpx;
  background: var(--ev-accent-soft);
  border: 1px solid var(--ev-accent);
}

.retry-text { font-size: 26rpx; color: var(--ev-accent); font-weight: 500; }
.error-text { color: var(--ev-negative); }
</style>
