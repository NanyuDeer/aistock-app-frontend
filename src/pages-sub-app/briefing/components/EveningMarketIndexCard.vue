<template>
  <view class="market-index-card">
    <view class="section-title">
      <text class="title-text">大盘行情</text>
    </view>

    <Card class="index-card-body">
      <!-- 指数表现：参考 MarketTracePhenomenon.vue 的 perf-list -->
      <view v-if="indexes.length > 0" class="perf-block">
        <text class="block-label">指数表现</text>
        <view class="perf-list">
          <view v-for="idx in indexes" :key="idx.name" class="perf-item">
            <text class="perf-name">{{ idx.name }}</text>
            <text class="perf-change" :class="changeClass(idx.pctChange)">{{ formatPct(idx.pctChange) }}</text>
          </view>
        </view>
      </view>

      <!-- 涨跌家数：参考 MarketSnapshotCard.vue 的 ms-breadth 三栏布局 -->
      <view v-if="hasBreadth" class="breadth-block">
        <text class="block-label">涨跌家数</text>
        <view class="breadth">
          <view class="b-col up">
            <text class="b-num">{{ formatCount(breadth?.advanceCount) }}</text>
            <text class="b-label">上涨</text>
          </view>
          <view class="b-col flat">
            <text class="b-num">{{ formatCount(breadth?.flatCount) }}</text>
            <text class="b-label">平盘</text>
          </view>
          <view class="b-col down">
            <text class="b-num">{{ formatCount(breadth?.declineCount) }}</text>
            <text class="b-label">下跌</text>
          </view>
        </view>
      </view>

      <!-- 空态：indexes 和 breadth 都没数据时 -->
      <view v-if="indexes.length === 0 && !hasBreadth" class="empty">
        <text class="empty-text">本日大盘数据暂无</text>
      </view>
    </Card>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import type { MarketTraceIndexPerf } from '@/modules/analytics/utils/marketTraceReview'
import type { MarketBreadth } from '@/shared/utils/eveningBriefCards'

const props = defineProps<{
  /** 指数列表（name + pctChange） */
  indexes: MarketTraceIndexPerf[]
  /** 涨跌家数（advanceCount / declineCount / flatCount，缺失字段为 null） */
  breadth: MarketBreadth | null
}>()

const hasBreadth = computed(() => {
  const b = props.breadth
  if (!b) return false
  return b.advanceCount !== null || b.declineCount !== null || b.flatCount !== null
})

/** A 股红涨绿跌：pctChange > 0 → up（红），< 0 → down（绿），0/null → flat */
function changeClass(pct: number | null): string {
  if (pct === null) return 'flat'
  return pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
}

function formatPct(pct: number | null): string {
  if (pct === null) return '--'
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

function formatCount(count: number | null): string {
  if (count === null) return '--'
  return String(count)
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
@use '@/shared/styles/breakpoints.scss' as bp;

.market-index-card {
  padding: 0 $spacing-base;
  margin-bottom: $spacing-sm;
}

.section-title {
  display: flex;
  align-items: center;
  margin: $spacing-base 0 $spacing-sm;
}

.title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-color-title;
}

.index-card-body {
  margin: 0;
}

.perf-block,
.breadth-block {
  margin-bottom: $spacing-sm;

  &:last-child {
    margin-bottom: 0;
  }
}

.block-label {
  display: block;
  font-size: 22rpx;
  color: $text-color-secondary;
  margin-bottom: $spacing-xs;
}

/* 指数列表：参考 MarketTracePhenomenon.vue 的 perf-list（flex wrap） */
.perf-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  @include bp.respond-to-lg {
    gap: 12rpx;
  }
}

.perf-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: $r-md;
  background: $bg-soft;
  min-width: 200rpx;
}

.perf-name {
  font-size: 22rpx;
  color: $text-color;
  flex: 1;
}

.perf-change {
  font-size: 24rpx;
  font-weight: 600;
  font-family: $font-mono;
}

.perf-change.up {
  color: $up;
}

.perf-change.down {
  color: $down;
}

.perf-change.flat {
  color: $text-color-secondary;
}

/* 涨跌家数三栏：参考 MarketSnapshotCard.vue 的 ms-breadth */
.breadth {
  display: flex;
}

.b-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  border-radius: $r-xs;
  padding: 8rpx 0;
}

.b-col.up {
  background: $up-bg;
}

.b-col.flat {
  background: $bg-soft;
}

.b-col.down {
  background: $down-bg;
}

.b-num {
  font-size: 30rpx;
  font-weight: 700;
}

.b-col.up .b-num {
  color: $up;
}

.b-col.flat .b-num {
  color: $flat;
}

.b-col.down .b-num {
  color: $down;
}

.b-label {
  font-size: 20rpx;
  color: $ink-mute;
}

.empty {
  padding: $spacing-base 0;
  text-align: center;
}

.empty-text {
  font-size: 24rpx;
  color: $text-color-secondary;
}
</style>
