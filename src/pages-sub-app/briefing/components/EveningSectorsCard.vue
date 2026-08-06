<template>
  <view class="sectors-card">
    <view class="card-label">
      <text class="card-dot">●</text>
      <text class="card-label-text">板块行情</text>
    </view>

    <!-- 领涨板块 -->
    <view v-if="topGainers.length" class="block">
      <text class="block-label">领涨</text>
      <view class="rank-list">
        <view v-for="s in topGainers" :key="`g-${s.name}`" class="rank-item">
          <text class="rank-name">{{ s.name }}</text>
          <text class="rank-pct up">{{ formatPct(s.pctChange) }}</text>
        </view>
      </view>
    </view>

    <!-- 领跌板块 -->
    <view v-if="topLosers.length" class="block">
      <text class="block-label">领跌</text>
      <view class="rank-list">
        <view v-for="s in topLosers" :key="`l-${s.name}`" class="rank-item">
          <text class="rank-name">{{ s.name }}</text>
          <text class="rank-pct down">{{ formatPct(s.pctChange) }}</text>
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <view v-if="!topGainers.length && !topLosers.length" class="empty">
      <text class="empty-text">本日板块数据暂无</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{ presentation: MarketTracePresentation }>()

const topGainers = computed(() => props.presentation.sectorRanking.topGainers)
const topLosers = computed(() => props.presentation.sectorRanking.topLosers)

function formatPct(v: number | null): string {
  if (v === null) return '--'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}
</script>

<style lang="scss" scoped>
/* 样式对齐早报头条/异动公告卡片：
   白底 + 左侧 8rpx 强调条 + 圆角 20rpx */
.sectors-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid $line;
  border-left: 8rpx solid $primary;
}

.card-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.card-dot {
  font-size: 20rpx;
  color: $primary;
}

.card-label-text {
  font-size: 22rpx;
  font-weight: 700;
  color: $primary;
  letter-spacing: 2rpx;
}

.block {
  margin-bottom: 24rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.block-label {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
  margin-bottom: 12rpx;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.rank-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(77, 124, 254, 0.04);
}

.rank-name {
  font-size: 24rpx;
  font-weight: 500;
  color: $ink;
  flex: 1;
}

.rank-pct {
  font-size: 26rpx;
  font-weight: 700;
}

.rank-pct.up {
  color: #e04545;
}

.rank-pct.down {
  color: #2ba84a;
}

.empty {
  padding: 32rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 24rpx;
  color: #9ca3af;
}
</style>
