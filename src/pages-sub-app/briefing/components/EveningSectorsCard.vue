<template>
  <view class="insight-row">
    <view class="insight-icon sector">
      <text class="insight-icon-text">块</text>
    </view>
    <view class="insight-body">
      <view class="insight-top">
        <text class="insight-source">板块行情</text>
      </view>

      <!-- 领涨板块 -->
      <view v-if="topGainers.length" class="block">
        <view class="rank-list">
          <view v-for="s in topGainers" :key="`g-${s.name}`" class="mini-tag">
            <text class="rank-name">{{ s.name }}</text>
            <text class="rank-pct up">{{ formatPct(s.pctChange) }}</text>
          </view>
        </view>
      </view>

      <!-- 领跌板块 -->
      <view v-if="topLosers.length" class="block">
        <view class="rank-list">
          <view v-for="s in topLosers" :key="`l-${s.name}`" class="mini-tag">
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
/* 样式对齐早报 Agent 洞见行：
   白底 + 圆角 20rpx + 左侧圆角图标 + 标题 + 内容 */
.insight-row {
  display: flex;
  gap: 24rpx;
  align-items: flex-start;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid $line;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.03);
}

.insight-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: $primary;

  &.sector {
    background: #7c3aed;
  }
}

.insight-icon-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}

.insight-body {
  flex: 1;
  min-width: 0;
}

.insight-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.insight-source {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
  line-height: 1.4;
}

.block {
  margin-bottom: 12rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

/* 板块列表：对齐早报 mini-tag 风格（圆角胶囊 + 浅蓝底） */
.rank-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.mini-tag {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  font-size: 20rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(77, 124, 254, 0.04);
  color: $primary;
}

.rank-name {
  font-size: 22rpx;
  color: $ink;
  font-weight: 500;
}

.rank-pct {
  font-size: 22rpx;
  font-weight: 700;
}

.rank-pct.up {
  color: #e04545;
}

.rank-pct.down {
  color: #2ba84a;
}

.empty {
  padding: 16rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 24rpx;
  color: #9ca3af;
}
</style>
