<template>
  <view class="summary-card" v-if="data">
    <!-- 评级标签 -->
    <view class="summary-rating" :class="'rating-' + data.rating">
      <text class="rating-text">{{ ratingLabel }}</text>
    </view>

    <!-- 核心判断 -->
    <view class="summary-section">
      <text class="section-title">核心判断</text>
      <text class="conclusion-text">{{ data.conclusion }}</text>
      <view class="key-points">
        <text v-for="(kp, i) in data.keyPoints" :key="i" class="key-point">• {{ kp }}</text>
      </view>
    </view>

    <!-- 关注方向 -->
    <view class="summary-section" v-if="data.focusIndustries.length">
      <text class="section-title">关注方向</text>
      <view class="focus-list">
        <view v-for="fi in data.focusIndustries" :key="fi.name" class="focus-item" :class="'focus-' + fi.direction">
          <text class="focus-name">{{ fi.name }}</text>
          <text class="focus-dir">{{ fi.direction === 'positive' ? '↑' : '↓' }}</text>
          <text class="focus-reason">{{ fi.reason }}</text>
        </view>
      </view>
    </view>

    <!-- 投资机会 -->
    <view class="summary-section" v-if="data.opportunities.length">
      <text class="section-title">存在机会</text>
      <view class="opp-list">
        <text v-for="(op, i) in data.opportunities" :key="i" class="opp-item">• {{ op }}</text>
      </view>
    </view>

    <!-- 风险提示 -->
    <view class="summary-section risk-section" v-if="data.risks.length">
      <text class="section-title risk-title">风险提示</text>
      <view class="risk-list">
        <text v-for="(r, i) in data.risks" :key="i" class="risk-item">• {{ r }}</text>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
/**
 * InvestmentSummaryCard — AI 投资总结卡片
 *
 * 展示 AI 的最终投资观点，包括核心判断、关注方向、存在机会、风险提示。
 *
 * Props: data — InvestmentSummary
 */
import { computed } from 'vue'
import type { InvestmentSummary } from '../types'

interface Props {
  data?: InvestmentSummary | null
}

const props = defineProps<Props>()

const ratingLabel = computed(() => {
  switch (props.data?.rating) {
    case 'positive': return '整体偏积极'
    case 'negative': return '整体偏谨慎'
    default: return '整体中性'
  }
})
</script>

<style scoped>
.summary-card {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 评级标签 */
.summary-rating {
  display: inline-flex;
  align-self: flex-start;
  padding: 6rpx 16rpx;
  border-radius: 9999rpx;
  margin-bottom: 16rpx;
}

.rating-positive { background: var(--ev-positive-soft); border: 1px solid var(--ev-positive-soft); }
.rating-positive .rating-text { color: var(--ev-positive); }
.rating-neutral { background: rgba(148,163,184,0.1); border: 1px solid rgba(148,163,184,0.15); }
.rating-neutral .rating-text { color: var(--ev-text-tertiary); }
.rating-negative { background: var(--ev-negative-soft); border: 1px solid rgba(244,63,94,0.2); }
.rating-negative .rating-text { color: var(--ev-negative); }

.rating-text { font-size: 20rpx; font-weight: 600; }

/* 区块 */
.summary-section {
  padding: 16rpx 0;
  border-bottom: 1px solid var(--ev-border-light);
}
.summary-section:last-of-type { border-bottom: none; }

.section-title {
  display: block;
  font-size: 22rpx;
  font-weight: 600;
  color: var(--ev-accent);
  margin-bottom: 10rpx;
}
.conclusion-text {
  font-size: 24rpx;
  color: var(--ev-text-secondary);
  line-height: 1.6;
  display: block;
  margin-bottom: 12rpx;
}

.key-points { display: flex; flex-direction: column; gap: 6rpx; }
.key-point { font-size: 22rpx; color: var(--ev-text-tertiary); line-height: 1.5; }

/* 关注方向 */
.focus-list { display: flex; flex-direction: column; gap: 10rpx; }

.focus-item {
  padding: 12rpx 16rpx;
  border-radius: 8rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
}

.focus-positive { background: var(--ev-negative-bg); }
.focus-negative { background: var(--ev-positive-bg); }

.focus-name { font-size: 22rpx; font-weight: 600; color: var(--ev-text-primary); }
.focus-dir { font-size: 20rpx; font-weight: 700; }
.focus-positive .focus-dir { color: var(--ev-negative); }
.focus-negative .focus-dir { color: var(--ev-positive); }
.focus-reason { font-size: 20rpx; color: var(--ev-text-muted); width: 100%; }

/* 机会 */
.opp-list { display: flex; flex-direction: column; gap: 6rpx; }
.opp-item { font-size: 22rpx; color: var(--ev-text-tertiary); line-height: 1.5; }

/* 风险 */
.risk-section { border-bottom: none; }
.risk-title { color: var(--ev-negative); }
.risk-list { display: flex; flex-direction: column; gap: 6rpx; }
.risk-item { font-size: 22rpx; color: var(--ev-negative); line-height: 1.5; }
</style>
