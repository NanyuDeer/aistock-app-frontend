<template>
  <view class="sectors-section" v-if="hasData">
    <view class="section-title">
      <text class="title-text">板块强弱</text>
    </view>
    <Card class="sectors-card">
      <view v-if="ranking.topGainers.length" class="rank-block">
        <text class="block-label">领涨</text>
        <view class="rank-list">
          <view v-for="s in ranking.topGainers" :key="`g-${s.name}`" class="rank-item">
            <text class="rank-name">{{ s.name }}</text>
            <text class="rank-pct up">{{ formatPct(s.pctChange) }}</text>
          </view>
        </view>
      </view>
      <view v-if="ranking.topLosers.length" class="rank-block">
        <text class="block-label">领跌</text>
        <view class="rank-list">
          <view v-for="s in ranking.topLosers" :key="`l-${s.name}`" class="rank-item">
            <text class="rank-name">{{ s.name }}</text>
            <text class="rank-pct down">{{ formatPct(s.pctChange) }}</text>
          </view>
        </view>
      </view>
      <view v-if="!ranking.topGainers.length && !ranking.topLosers.length" class="empty">
        <text class="empty-text">本日板块数据暂无</text>
      </view>
    </Card>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{ presentation: MarketTracePresentation }>()

const ranking = computed(() => props.presentation.sectorRanking)
const hasData = computed(() => ranking.value.topGainers.length > 0 || ranking.value.topLosers.length > 0)

function formatPct(v: number | null): string {
  if (v === null) return '--'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
@use '@/shared/styles/breakpoints.scss' as bp;

.sectors-section { padding: 0 $spacing-base; margin-bottom: $spacing-sm; }
.section-title { display: flex; align-items: center; margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: 28rpx; font-weight: 600; color: $text-color-title; }
.sectors-card { margin: 0; }
.rank-block { margin-bottom: $spacing-sm; &:last-child { margin-bottom: 0; } }
.block-label { display: block; font-size: 22rpx; color: $text-color-secondary; margin-bottom: $spacing-xs; }
.rank-list {
  display: grid; grid-template-columns: 1fr; gap: 8rpx;
  @include bp.respond-to-md { grid-template-columns: 1fr 1fr; }
  @include bp.respond-to-lg { grid-template-columns: repeat(3, 1fr); }
}
.rank-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8rpx 16rpx; border-radius: $r-md; background: $bg-soft;
}
.rank-name { font-size: 22rpx; color: $text-color; flex: 1; }
.rank-pct { font-size: 24rpx; font-weight: 600; font-family: $font-mono; }
.up { color: $up; }
.down { color: $down; }
.empty { padding: $spacing-base 0; text-align: center; }
.empty-text { font-size: 24rpx; color: $text-color-secondary; }
</style>
