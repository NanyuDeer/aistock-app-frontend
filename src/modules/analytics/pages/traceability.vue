<template>
  <view class="page-traceability">
    <SubPageCard title="大盘溯源">
      <LoadingState v-if="loading" />

      <Card v-else-if="error" class="error-state">
        <EmptyState title="复盘报告暂不可用" description="报告内容不完整或服务暂时不可用，请稍后重试" icon="cloud-off-line">
          <Button size="sm" @click="retry">重试</Button>
        </EmptyState>
      </Card>

      <EmptyState
        v-else-if="reportAvailability === 'pending'"
        title="复盘报告生成中"
        description="报告生成完成后将在此展示"
      />

      <EmptyState
        v-else-if="reportAvailability === 'failed'"
        title="暂无可用的复盘报告"
        description="当前最新复盘报告未能完成，请等待后续报告"
      />

      <EmptyState v-else-if="!presentation" text="当日暂无已完成复盘报告" />

      <view v-else class="report-content">
        <MarketTraceHeader :presentation="presentation" />
        <MarketTracePendingRisks :presentation="presentation" />
        <MarketTracePhenomenon :presentation="presentation" />
        <MarketTraceTimeline :presentation="presentation" :layout="timelineLayout" />
        <MarketTraceAlternatives :presentation="presentation" />
        <MarketTraceRejected :presentation="presentation" />

        <!-- 折叠兜底：完整 markdown -->
        <view class="markdown-section">
          <view class="section-title" @tap="toggleMarkdown">
            <text class="title-text">完整报告（原始）</text>
            <text class="toggle-icon" :class="{ 'is-open': showMarkdown }">▾</text>
          </view>
          <view v-if="showMarkdown" class="markdown-card">
            <rich-text :nodes="markdownHtml" class="report-html" />
          </view>
        </view>
      </view>
    </SubPageCard>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { LoadingState, EmptyState, Button, Card } from '@/shared/components'
import { agentApi } from '@/shared/api/modules/agent'
import { shanghaiDateString } from '@/shared/utils/tradingTime'
import { markdownToHtml } from '@/shared/utils/markdown'
import { useResponsive } from '@/shared/utils/useResponsive'
import { toMarketTracePresentation, type MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'
import MarketTraceHeader from '@/modules/analytics/components/MarketTraceHeader.vue'
import MarketTracePendingRisks from '@/modules/analytics/components/MarketTracePendingRisks.vue'
import MarketTracePhenomenon from '@/modules/analytics/components/MarketTracePhenomenon.vue'
import MarketTraceTimeline from '@/modules/analytics/components/MarketTraceTimeline.vue'
import MarketTraceAlternatives from '@/modules/analytics/components/MarketTraceAlternatives.vue'
import MarketTraceRejected from '@/modules/analytics/components/MarketTraceRejected.vue'

const loading = ref(false)
const error = ref(false)
const presentation = ref<MarketTracePresentation | null>(null)
const reportAvailability = ref<'pending' | 'failed' | null>(null)
const showMarkdown = ref(false)

const { breakpoint } = useResponsive()
const timelineLayout = computed<'vertical' | 'horizontal'>(() => {
  return breakpoint.value === 'sm' ? 'vertical' : 'horizontal'
})

const markdownHtml = computed(() => {
  return presentation.value ? markdownToHtml(presentation.value.markdownDetails) : ''
})

async function fetchData() {
  loading.value = true
  error.value = false
  presentation.value = null
  reportAvailability.value = null
  const requestedDate = shanghaiDateString()

  try {
    const record = await agentApi.getMarketTraceReview(requestedDate)
    if (record && record.status !== 'completed') {
      reportAvailability.value = record.status === 'queued' || record.status === 'processing'
        ? 'pending'
        : 'failed'
      return
    }
    presentation.value = record ? toMarketTracePresentation(record, requestedDate) : null
    if (record && !presentation.value) {
      throw new Error('复盘报告字段不完整')
    }
  } catch (err: unknown) {
    console.error('Failed to fetch market trace review:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

function retry() {
  void fetchData()
}

function toggleMarkdown() {
  showMarkdown.value = !showMarkdown.value
}

onShow(() => {
  void fetchData()
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.page-traceability { height: 100%; }
.report-content { display: flex; flex-direction: column; gap: 0; padding: 0 0 $spacing-base 0; }
.error-state { margin: $spacing-base; }

.markdown-section { padding: 0 $spacing-base; margin-top: $spacing-base; }
.markdown-section .section-title {
  display: flex; align-items: center; justify-content: space-between;
  padding: $spacing-sm; background: $bg-soft; border-radius: $r-md;
}
.title-text { font-size: 26rpx; font-weight: 500; color: $text-color-title; }
.toggle-icon { font-size: 24rpx; color: $text-color-secondary; transition: transform 0.2s; }
.toggle-icon.is-open { transform: rotate(180deg); }
.markdown-card {
  margin-top: $spacing-sm; padding: $spacing-base;
  background: $bg-card; border-radius: $r-md; box-shadow: $shadow-card;
}
.report-html { display: block; color: $text-color; font-size: 24rpx; line-height: 1.7; }
.report-html :deep(.md-h2) { margin: 12rpx 0; color: $text-color-title; font-size: 28rpx; font-weight: 600; }
.report-html :deep(.md-h1) { margin: 12rpx 0; color: $text-color-title; font-size: 30rpx; font-weight: 600; }
.report-html :deep(.md-h3) { margin: 10rpx 0; color: $text-color-title; font-size: 26rpx; font-weight: 600; }
</style>
