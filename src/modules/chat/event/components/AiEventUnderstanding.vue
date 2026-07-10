<template>
  <view class="event-understanding" v-if="data">
    <!-- 事件概括 -->
    <view class="eu-section">
      <text class="eu-section-title">事件概括</text>
      <text class="eu-summary">{{ data.summary }}</text>
    </view>

    <!-- 核心变化 -->
    <view class="eu-section">
      <text class="eu-section-title">核心变化</text>
      <view class="eu-changes">
        <view v-for="(ch, idx) in data.coreChanges" :key="idx" class="eu-change-row">
          <text class="change-var">{{ ch.variable }}</text>
          <view class="change-flow">
            <text class="change-before">{{ ch.before }}</text>
            <text class="change-arrow">→</text>
            <text class="change-after">{{ ch.after }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * AiEventUnderstanding — AI 事件理解
 *
 * 展示 AI 对事件本质的分析：概括 → 核心变化 → 影响起点 → 初步判断。
 * 属于 AI 推理流程的第一步，取代原来的事件基本信息展示。
 *
 * Props: data — EventUnderstanding
 */
import type { EventUnderstanding } from '../types'

interface Props {
  data?: EventUnderstanding | null
}

defineProps<Props>()
</script>

<style scoped>
.event-understanding {
  display: flex;
  flex-direction: column;
}

.eu-section {
  padding: 16rpx 0;
  border-bottom: 1px solid var(--ev-border-light);
}
.eu-section:last-child { border-bottom: none; }

.eu-section-title {
  display: block;
  font-size: 22rpx;
  font-weight: 600;
  color: var(--ev-accent);
  margin-bottom: 10rpx;
}

.eu-summary {
  font-size: 24rpx;
  color: var(--ev-text-secondary);
  line-height: 1.6;
}

/* 核心变化 */
.eu-changes { display: flex; flex-direction: column; gap: 12rpx; }

.eu-change-row {
  padding: 12rpx 16rpx;
  border-radius: 8rpx;
  background: var(--ev-bg-elevated);
}
.change-var { display: block; font-size: 22rpx; font-weight: 600; color: var(--ev-text-primary); margin-bottom: 6rpx; }
.change-flow { display: flex; align-items: center; gap: 10rpx; }
.change-before { font-size: 20rpx; color: var(--ev-text-muted); }
.change-arrow { font-size: 18rpx; color: var(--ev-accent); }
.change-after { font-size: 20rpx; color: var(--ev-text-secondary); font-weight: 500; }
</style>
