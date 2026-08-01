<template>
  <Card class="trace-header">
    <view class="header-top">
      <view class="header-icon">
        <SvgIcon name="bar-chart-line" size="32rpx" color="#ffffff" />
      </view>
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
      <view class="header-row">
        <text class="row-label">置信度</text>
        <text class="row-value">{{ confidenceLabel }}</text>
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
import SvgIcon from '@/shared/components/SvgIcon.vue'
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
.header-icon {
  width: 60rpx; height: 60rpx; border-radius: 14rpx;
  background: $brand-gradient;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}
.header-text { flex: 1; }
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
</style>
