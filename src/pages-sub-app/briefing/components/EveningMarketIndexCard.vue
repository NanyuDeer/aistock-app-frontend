<template>
  <view class="insight-row">
    <view class="insight-icon">
      <text class="insight-icon-text">盘</text>
    </view>
    <view class="insight-body">
      <view class="insight-top">
        <text class="insight-source">大盘行情</text>
      </view>

      <!-- 指数表现 -->
      <view v-if="indexes.length > 0" class="block">
        <view class="perf-list">
          <view v-for="idx in indexes" :key="idx.name" class="mini-tag">
            <text class="perf-name">{{ idx.name }}</text>
            <text v-if="idx.close !== null" class="perf-close">{{ formatClose(idx.close) }}</text>
            <text class="perf-change" :class="changeClass(idx.pctChange)">{{ formatPct(idx.pctChange) }}</text>
          </view>
        </view>
      </view>

      <!-- 涨跌家数 -->
      <view v-if="hasBreadth" class="block">
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

      <!-- 空态 -->
      <view v-if="indexes.length === 0 && !hasBreadth" class="empty">
        <text class="empty-text">本日大盘数据暂无</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MarketTraceIndexPerf } from '@/modules/analytics/utils/marketTraceReview'
import type { MarketBreadth } from '@/shared/utils/eveningBriefCards'

const props = defineProps<{
  /** 指数列表（name + close + pctChange） */
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

function formatClose(close: number | null): string {
  if (close === null) return '--'
  return close.toFixed(2)
}

function formatCount(count: number | null | undefined): string {
  if (count === null) return '--'
  return String(count)
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
  margin-bottom: 16rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

/* 指数列表：对齐早报 mini-tag 风格（圆角胶囊 + 浅蓝底） */
.perf-list {
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

.perf-name {
  font-size: 22rpx;
  color: $ink;
  font-weight: 500;
}

.perf-close {
  font-size: 20rpx;
  color: #9ca3af;
}

.perf-change {
  font-size: 24rpx;
  font-weight: 700;
}

.perf-change.up {
  color: #e04545;
}

.perf-change.down {
  color: #2ba84a;
}

.perf-change.flat {
  color: #9ca3af;
}

/* 涨跌家数三栏 */
.breadth {
  display: flex;
  gap: 8rpx;
}

.b-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  border-radius: 12rpx;
  padding: 12rpx 0;
}

.b-col.up {
  background: rgba(224, 69, 69, 0.08);
}

.b-col.flat {
  background: rgba(148, 163, 184, 0.10);
}

.b-col.down {
  background: rgba(43, 168, 74, 0.08);
}

.b-num {
  font-size: 30rpx;
  font-weight: 700;
}

.b-col.up .b-num {
  color: #e04545;
}

.b-col.flat .b-num {
  color: #64748b;
}

.b-col.down .b-num {
  color: #2ba84a;
}

.b-label {
  font-size: 20rpx;
  color: #9ca3af;
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
