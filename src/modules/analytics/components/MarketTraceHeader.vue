<template>
  <Card class="trace-header">
    <view class="header-top">
      <view class="header-text">
        <text class="header-title">{{ presentation.reportTitle }}</text>
        <text class="header-desc">基于已完成的收盘复盘报告</text>
      </view>
      <Badge :type="statusBadgeType">{{ statusText }}</Badge>
    </view>
    <view class="header-body">
      <view class="header-row">
        <text class="row-label">报告日期</text>
        <text class="row-value">{{ presentation.reportDate || '--' }}</text>
      </view>
      <view class="header-row">
        <text class="row-label">生成时间</text>
        <text class="row-value">{{ generatedAtText }}</text>
      </view>
      <view class="header-row">
        <text class="row-label">归因状态</text>
        <text class="row-value">{{ attributionLabel }}</text>
      </view>
      <view class="header-row confidence-row">
        <text class="row-label">置信度</text>
        <view class="confidence-gauge">
          <view class="confidence-bar">
            <view class="confidence-fill" :class="confidenceClass" :style="{ width: confidencePercent }"></view>
          </view>
          <text class="confidence-value" :class="confidenceClass">{{ confidenceLabel }}</text>
        </view>
      </view>
      <text v-if="presentation.isFallback" class="fallback-notice">
        当日报告尚未生成，当前显示最近可用报告（{{ presentation.reportDate }}）
      </text>
    </view>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import Badge from '@/shared/components/Badge.vue'
import { formatShanghaiDateTime } from '@/shared/utils/datetime'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{ presentation: MarketTracePresentation }>()

const generatedAtText = computed(() => {
  const t = props.presentation.generatedAt
  return t ? formatShanghaiDateTime(t) || t : '--'
})

const attributionLabel = computed(() => {
  const map: Record<string, string> = {
    confirmed: '已确认',
    hypothesis: '假设',
    insufficient: '证据不足',
    not_applicable: '不适用',
  }
  return map[props.presentation.attributionStatus] ?? '--'
})

const confidenceLabel = computed(() => {
  const c = props.presentation.confidence
  if (!c) return '未提供'
  return { high: '高', medium: '中', low: '低' }[c] ?? '--'
})

const confidenceClass = computed(() => {
  const c = props.presentation.confidence
  if (c === 'high') return 'is-high'
  if (c === 'medium') return 'is-medium'
  if (c === 'low') return 'is-low'
  return ''
})

const confidencePercent = computed(() => {
  const c = props.presentation.confidence
  if (c === 'high') return '100%'
  if (c === 'medium') return '66%'
  if (c === 'low') return '33%'
  return '0%'
})

const statusBadgeType = computed<'success' | 'warning' | 'danger' | 'info'>(() => {
  if (props.presentation.isFallback) return 'warning'
  if (props.presentation.attributionStatus === 'insufficient') return 'warning'
  if (props.presentation.attributionStatus === 'not_applicable') return 'info'
  return 'success'
})

const statusText = computed(() => {
  if (props.presentation.isFallback) return '回退显示'
  if (props.presentation.attributionStatus === 'insufficient') return '证据不足'
  if (props.presentation.attributionStatus === 'not_applicable') return '不适用'
  return '已更新'
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.trace-header { margin: $spacing-base; }
.header-top { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-base; }
.header-text { flex: 1; min-width: 0; }
.header-title { font-size: 30rpx; font-weight: 600; color: $text-color-title; display: block; }
.header-desc { font-size: 22rpx; color: $text-color-secondary; margin-top: 4rpx; display: block; }
.header-body { display: flex; flex-direction: column; gap: $spacing-sm; }
.header-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12rpx 0; border-bottom: 1rpx solid $line-soft;
  &:last-child { border-bottom: none; }
}
.row-label { font-size: 24rpx; color: $text-color-secondary; }
.row-value { font-size: 24rpx; color: $text-color-title; font-weight: 500; }
.fallback-notice { padding-top: $spacing-sm; color: $warning; font-size: 22rpx; line-height: 1.5; }

/* 置信度进度条 */
.confidence-row { gap: $spacing-sm; }
.confidence-gauge {
  display: flex; align-items: center; gap: $spacing-xs;
  flex: 1; max-width: 50%;
}
.confidence-bar {
  flex: 1; height: 12rpx; border-radius: $r-full;
  background: $line; overflow: hidden;
}
.confidence-fill {
  height: 100%; border-radius: $r-full; background: $text-color-secondary;
  transition: width 0.3s;
}
.confidence-fill.is-high { background: $up; }
.confidence-fill.is-medium { background: $warning; }
.confidence-fill.is-low { background: $text-color-secondary; }
.confidence-value {
  font-size: 24rpx; font-weight: 600; flex-shrink: 0;
  color: $text-color-title;
}
.confidence-value.is-high { color: $up; }
.confidence-value.is-medium { color: $warning; }
.confidence-value.is-low { color: $text-color-secondary; }
</style>
