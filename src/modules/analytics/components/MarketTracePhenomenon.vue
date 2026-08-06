<template>
  <view class="phenomenon-section">
    <view class="section-title">
      <text class="title-text">核心现象</text>
      <Tag type="warning" size="sm">{{ presentation.phenomenon.kindLabel }}</Tag>
      <Tag type="neutral" size="sm">严重度：{{ presentation.phenomenon.severityLabel }}</Tag>
    </view>
    <Card class="phenomenon-card">
      <text class="phenomenon-summary">{{ presentation.phenomenon.summary }}</text>

      <view v-if="presentation.phenomenon.indexPerformance.length" class="perf-block">
        <text class="block-label">指数表现</text>
        <view class="perf-list">
          <view v-for="idx in presentation.phenomenon.indexPerformance" :key="idx.name" class="perf-item">
            <text class="perf-name">{{ idx.name }}</text>
            <text class="perf-change" :class="changeClass(idx.pctChange)">{{ formatPct(idx.pctChange) }}</text>
          </view>
        </view>
      </view>

      <view v-if="presentation.phenomenon.topGainers.length" class="sector-block">
        <text class="block-label">领涨</text>
        <view class="sector-list">
          <view v-for="s in presentation.phenomenon.topGainers" :key="`g-${s.name}`" class="sector-item">
            <text class="sector-name">{{ s.name }}</text>
            <text class="sector-pct up">{{ formatPct(s.pctChange) }}</text>
          </view>
        </view>
      </view>

      <view v-if="presentation.phenomenon.topLosers.length" class="sector-block">
        <text class="block-label">领跌</text>
        <view class="sector-list">
          <view v-for="s in presentation.phenomenon.topLosers" :key="`l-${s.name}`" class="sector-item">
            <text class="sector-name">{{ s.name }}</text>
            <text class="sector-pct down">{{ formatPct(s.pctChange) }}</text>
          </view>
        </view>
      </view>
    </Card>
  </view>
</template>

<script setup lang="ts">
import Card from '@/shared/components/Card.vue'
import Tag from '@/shared/components/Tag.vue'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

defineProps<{ presentation: MarketTracePresentation }>()

function formatPct(v: number | null): string {
  if (v === null) return '--'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

function changeClass(v: number | null): string {
  if (v === null) return 'flat'
  return v >= 0 ? 'up' : 'down'
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
@use '@/shared/styles/breakpoints.scss' as bp;

.phenomenon-section { padding: 0 $spacing-base; margin-bottom: $spacing-sm; }
.section-title { display: flex; align-items: center; gap: $spacing-sm; margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: 28rpx; font-weight: 600; color: $text-color-title; }
.phenomenon-card { margin: 0; }
.phenomenon-summary { display: block; color: $text-color-title; font-size: 26rpx; line-height: 1.6; margin-bottom: $spacing-sm; }
.perf-block, .sector-block { margin-top: $spacing-sm; }
.block-label { display: block; font-size: 22rpx; color: $text-color-secondary; margin-bottom: $spacing-xs; }

.perf-list {
  display: flex; flex-wrap: wrap; gap: 8rpx;
  @include bp.respond-to-lg { gap: 12rpx; }
}
.perf-item {
  display: flex; align-items: center; gap: 8rpx;
  padding: 8rpx 16rpx; border-radius: $r-md;
  background: $bg-soft; min-width: 200rpx;
}
.perf-name { font-size: 22rpx; color: $text-color; flex: 1; }
.perf-change { font-size: 24rpx; font-weight: 600; font-family: $font-mono; }
.perf-change.up { color: $up; }
.perf-change.down { color: $down; }
.perf-change.flat { color: $text-color-secondary; }

.sector-list {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8rpx;
  @include bp.respond-to-lg { grid-template-columns: repeat(3, 1fr); }
}
.sector-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8rpx 16rpx; border-radius: $r-md; background: $bg-soft;
}
.sector-name { font-size: 22rpx; color: $text-color; flex: 1; }
.sector-pct { font-size: 24rpx; font-weight: 600; font-family: $font-mono; }
.sector-pct.up { color: $up; }
.sector-pct.down { color: $down; }
</style>
