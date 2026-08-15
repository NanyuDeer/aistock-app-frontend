<!--
  InsightResultBlock: 洞察归因结果公共区块（主导因素 / 次要因素 / 主因待验证 / 详细分析）
  供涨停雷达详情页（insight-detail.vue）与价格异动详情页（insight-detail-move.vue）复用。
-->
<template>
  <view>
    <view v-if="insight.primary_driver" class="driver">
      <text class="label">主导因素</text>
      <text class="value">{{ insight.primary_driver.label }}</text>
      <text class="cat">{{ categoryText(insight.primary_driver.category) }}</text>
      <text v-if="insight.primary_driver.confidence" class="conf">{{ confidenceText(insight.primary_driver.confidence) }}</text>
    </view>
    <view v-if="insight.secondary_drivers?.length" class="subs">
      <view v-for="d in insight.secondary_drivers" :key="d.label" class="sub">
        {{ d.label }} · {{ categoryText(d.category) }}
      </view>
    </view>
    <view v-if="insight.attribution_status === 'unconfirmed'" class="unconfirmed">主因待验证</view>
    <view v-if="insight.display_report?.details" class="detail-text">{{ insight.display_report.details }}</view>
  </view>
</template>

<script setup lang="ts">
import type { WatchlistInsight } from '@/shared/api/modules/insight'

defineProps<{ insight: WatchlistInsight }>()

function categoryText(c: string): string {
  return { industry_theme: '行业题材', company_event: '公司事件', earnings: '业绩', market: '市场', trading_sentiment: '交易情绪' }[c] || c
}

function confidenceText(c: string): string {
  return { high: '高置信', medium: '中置信', low: '低置信' }[c as 'high' | 'medium' | 'low'] || c
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.driver {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $s-2;
  padding: $s-3;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
}

.label {
  padding: 2rpx 12rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  color: $primary;
  background: $primary-50;
}

.value {
  font-size: $font-size-base;
  font-weight: 600;
  color: $ink;
}

.cat,
.conf {
  font-size: $font-size-xs;
  color: $ink-soft;
}

.subs {
  display: flex;
  flex-direction: column;
  gap: $s-2;
  padding: $s-3;
  margin-top: $s-2;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
}

.sub {
  font-size: $font-size-sm;
  color: $ink-soft;
}

.unconfirmed {
  margin-top: $s-2;
  padding: $s-2 $s-3;
  border-radius: $r-sm;
  font-size: $font-size-sm;
  color: $warning;
  background: $warning-bg;
}

.detail-text {
  margin-top: $s-2;
  padding: $s-3;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: 1.6;
}
</style>
