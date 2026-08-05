<!-- src/modules/analytics/components/MarketTracePredictionValidation.vue -->
<template>
  <view class="prediction-validation-section" v-if="predictionValidation">
    <view class="section-title">
      <text class="title-text">预判对照</text>
    </view>
    <Card class="prediction-validation-card">
      <view v-if="predictionValidation.status === 'no_forecast'" class="no-forecast">
        <text>无晨报预测可对照</text>
      </view>

      <view v-else class="validation-content">
        <view class="status-row">
          <text class="status-label">对照状态：</text>
          <text class="status-value" :class="statusClass">{{ statusText }}</text>
        </view>

        <view v-if="predictionValidation.sectorHits.length > 0" class="hits-section">
          <text class="hits-title">板块方向对照：</text>
          <view v-for="(hit, idx) in predictionValidation.sectorHits" :key="`sector-${idx}`" class="hit-item">
            <text class="hit-sector">{{ hit.sector }}</text>
            <text class="hit-detail">
              晨报看{{ directionText(hit.morningDirection) }}，实际{{ directionText(hit.actualDirection) }}，{{ hit.result === 'hit' ? '命中' : '偏离' }}
            </text>
            <text v-if="hit.result === 'miss' && hit.deviationNote" class="hit-note">（原因：{{ hit.deviationNote }}）</text>
          </view>
        </view>

        <view v-if="predictionValidation.eventHits.length > 0" class="hits-section">
          <text class="hits-title">事件影响对照：</text>
          <view v-for="(hit, idx) in predictionValidation.eventHits" :key="`event-${idx}`" class="hit-item">
            <text class="hit-event">{{ hit.eventTitle }}</text>
            <text class="hit-detail">预期{{ directionText(hit.morningDirection) }}，{{ hit.actualImpact }}，{{ resultText(hit.result) }}</text>
          </view>
        </view>

        <view v-if="predictionValidation.overallNote" class="overall-note">
          <text class="note-label">整体结论：</text>
          <text class="note-text">{{ predictionValidation.overallNote }}</text>
        </view>
      </view>
    </Card>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import type { PredictionValidationPresentation } from '../utils/marketTraceReview'

const props = defineProps<{
  predictionValidation: PredictionValidationPresentation | null
}>()

const statusText = computed(() => {
  const map: Record<string, string> = {
    hit: '全部命中',
    partial: '部分命中',
    miss: '全部偏离',
    no_forecast: '无晨报预测',
  }
  return map[props.predictionValidation?.status || 'no_forecast'] || ''
})

const statusClass = computed(() => {
  const status = props.predictionValidation?.status
  if (status === 'hit') return 'status-hit'
  if (status === 'partial') return 'status-partial'
  if (status === 'miss') return 'status-miss'
  return ''
})

function directionText(dir: string): string {
  const map: Record<string, string> = {
    bullish: '多',
    bearish: '空',
    neutral: '平',
  }
  return map[dir] || dir
}

function resultText(result: string): string {
  const map: Record<string, string> = {
    hit: '命中',
    miss: '偏离',
    unverifiable: '无法验证',
  }
  return map[result] || result
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.prediction-validation-section {
  padding: 0 $spacing-base;
  margin-bottom: $spacing-sm;
}

.section-title {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin: $spacing-base 0 $spacing-sm;
}

.title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-color-title;
}

.no-forecast {
  padding: $spacing-sm 0;
  color: $text-color-secondary;
  font-size: 28rpx;
}

.status-row {
  margin-bottom: $spacing-sm;
}

.status-label {
  font-size: 28rpx;
  color: $text-color-secondary;
}

.status-value {
  font-size: 28rpx;
  font-weight: 600;
}

.status-hit { color: $down; }
.status-partial { color: $warning; }
.status-miss { color: $up; }

.hits-section {
  margin-bottom: $spacing-sm;
}

.hits-title {
  font-size: 28rpx;
  color: $text-color-title;
  font-weight: 500;
  display: block;
  margin-bottom: $spacing-xs;
}

.hit-item {
  padding: $spacing-xs 0;
  font-size: 26rpx;
  color: $text-color-secondary;
}

.hit-sector, .hit-event {
  font-weight: 500;
  color: $text-color-title;
  margin-right: $spacing-xs;
}

.hit-note {
  color: $text-color-tertiary;
  font-size: 24rpx;
}

.overall-note {
  margin-top: $spacing-sm;
  padding-top: $spacing-sm;
  border-top: 2rpx solid $line;
}

.note-label {
  font-size: 28rpx;
  color: $text-color-secondary;
}

.note-text {
  font-size: 28rpx;
  color: $text-color-title;
}
</style>
