<template>
  <view class="history-timeline" v-if="events && events.length > 0">
    <view v-for="ev in events" :key="ev.historyId" class="timeline-item">
      <!-- 时间线节点 -->
      <view class="timeline-dot" :class="'dot-' + ev.sentiment" />
      <view class="timeline-line" v-if="ev.historyId !== events[events.length - 1]?.historyId" />

      <!-- 内容卡片 -->
      <view class="timeline-card">
        <view class="timeline-header">
          <text class="timeline-year">{{ ev.year }}</text>
          <text class="timeline-tag" :class="'tag-' + ev.sentiment">
            {{ ev.sentiment === 'bullish' ? '利好' : ev.sentiment === 'bearish' ? '利空' : '中性' }}
          </text>
        </view>
        <text class="timeline-title">{{ ev.title }}</text>
        <text class="timeline-change">{{ ev.industryChange }}</text>
        <view class="timeline-footer">
          <text class="timeline-pct" :class="ev.changePercentage >= 0 ? 'up' : 'down'">
            {{ ev.changePercentage >= 0 ? '+' : '' }}{{ ev.changePercentage }}%
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 历史事件时间线
 *
 * Props:
 * - events: 历史相似事件列表
 */
import type { HistoryEvent } from '../types'

interface Props {
  events?: HistoryEvent[]
}

defineProps<Props>()
</script>

<style scoped>
.history-timeline {
  position: relative;
  padding-left: 36rpx;
}

.timeline-item {
  position: relative;
  margin-bottom: 24rpx;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

/* 时间线圆点 */
.timeline-dot {
  position: absolute;
  left: -42rpx;
  top: 24rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  z-index: 2;
}

.dot-bullish { background: var(--ev-negative); box-shadow: 0 0 8rpx rgba(244,63,94,0.4); }
.dot-bearish { background: var(--ev-positive); box-shadow: 0 0 8rpx rgba(34,197,94,0.4); }
.dot-neutral { background: var(--ev-text-tertiary); }

/* 时间线竖线（下一条有才渲染） */
.timeline-line {
  position: absolute;
  left: -35rpx;
  top: 40rpx;
  bottom: -16rpx;
  width: 2rpx;
  background: rgba(148, 163, 184, 0.15);
  z-index: 1;
  pointer-events: none;
}

/* 卡片 */
.timeline-card {
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background: rgba(30, 35, 55, 0.8);
  border: 1px solid var(--ev-border);
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.timeline-year {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--ev-text-primary);
}

.timeline-tag {
  font-size: 18rpx;
  font-weight: 600;
  padding: 2rpx 12rpx;
  border-radius: 9999rpx;
}

.tag-bullish { background: var(--ev-negative-soft); color: var(--ev-negative); }
.tag-bearish { background: var(--ev-positive-soft); color: var(--ev-positive); }
.tag-neutral { background: rgba(148,163,184,0.1); color: var(--ev-text-tertiary); }

.timeline-title {
  display: block;
  font-size: 24rpx;
  color: var(--ev-text-secondary);
  line-height: 1.4;
  margin-bottom: 6rpx;
}

.timeline-change {
  display: block;
  font-size: 22rpx;
  color: var(--ev-text-muted);
  line-height: 1.4;
  margin-bottom: 8rpx;
}

.timeline-footer {
  display: flex;
  justify-content: flex-end;
}

.timeline-pct {
  font-size: 28rpx;
  font-weight: 700;
}

.timeline-pct.up { color: var(--ev-negative); }
.timeline-pct.down { color: var(--ev-positive); }
</style>
