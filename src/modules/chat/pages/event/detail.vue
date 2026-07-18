<template>
  <SubPageCard2 ref="subPageRef" title="AI事件分析" back-url="/modules/chat/pages/event/list">
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
    <template v-else-if="detail">
      <AiEventReport :detail="detail" @back="handleBack" />
    </template>
  </SubPageCard2>
</template>

<script setup lang="ts">
/**
 * 事件详情页
 *
 * 职责：获取事件ID → 获取基础信息 → 调用 AiEventReport 展示 AI 分析报告。
 * 使用 SubPageCard2 白色顶栏组件，思考状态通过副标题展示。
 */
import { onMounted, ref } from 'vue'
import { useEventDetail } from '@/modules/chat/event/composables/useEventDetail'
import AiEventReport from '@/modules/chat/event/components/AiEventReport.vue'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'

// ========== Composable ==========
const { detail, loading, error, fetchDetail } = useEventDetail()

// ========== 本地状态 ==========
const eventId = ref('')
/** SubPageCard2 组件引用，用于复用其 goBack 回退语义 */
const subPageRef = ref<InstanceType<typeof SubPageCard2> | null>(null)

// ========== 事件处理 ==========
/** AiEventReport back 事件 → 复用 SubPageCard2 的 goBack 回退语义 */
function handleBack(): void {
  subPageRef.value?.goBack()
}

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
</script>

<style scoped>
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
