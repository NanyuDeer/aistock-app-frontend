<template>
  <view class="as-quote-header">
    <!-- 股票信息行 -->
    <view class="as-quote-header__stock">
      <view class="as-quote-header__avatar">
        <text class="as-quote-header__avatar-text">{{ avatarChar }}</text>
      </view>
      <view class="as-quote-header__meta">
        <view class="as-quote-header__name-row">
          <text class="as-quote-header__name">{{ name }}</text>
          <view v-if="status" class="as-quote-header__status">
            <text class="as-quote-header__status-text">{{ status }}</text>
          </view>
        </view>
        <view class="as-quote-header__code-row">
          <text v-if="market" class="as-quote-header__market">{{ market }}</text>
          <text class="as-quote-header__code">{{ code }}</text>
        </view>
      </view>
    </view>

    <!-- 价格行 -->
    <view class="as-quote-header__price-row">
      <text class="as-quote-header__price" :class="trendClass">{{ formattedPrice }}</text>
      <text class="as-quote-header__change" :class="trendClass">{{ formattedChange }}</text>
      <view class="as-quote-header__change-tag" :class="trendClass">
        <text class="as-quote-header__change-tag-text">{{ formattedChangePercent }}</text>
      </view>
    </view>

    <!-- 指标行 -->
    <view v-if="metrics && metrics.length" class="as-quote-header__metrics">
      <view
        v-for="metric in metrics"
        :key="metric.label"
        class="as-quote-header__metric"
      >
        <text class="as-quote-header__metric-label">{{ metric.label }}</text>
        <text
          class="as-quote-header__metric-value"
          :class="metric.trend ? `is-${metric.trend}` : ''"
        >{{ metric.value }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface QuoteMetric {
  label: string
  value: string
  trend?: 'up' | 'down' | 'flat'
}

const props = withDefaults(defineProps<{
  name: string
  code: string
  market?: string
  price: number
  change: number
  changePercent: number
  status?: string
  metrics?: QuoteMetric[]
  avatarText?: string
}>(), {
  market: '',
  status: '',
  metrics: () => [],
  avatarText: ''
})

/* ===== 涨跌趋势 ===== */
const trendClass = computed(() => {
  if (props.change > 0) return 'is-up'
  if (props.change < 0) return 'is-down'
  return 'is-flat'
})

/* ===== 格式化显示 ===== */
const avatarChar = computed(() => {
  if (props.avatarText) return props.avatarText
  return props.name ? props.name.charAt(0) : ''
})

const formattedPrice = computed(() => {
  return props.price.toFixed(2)
})

const formattedChange = computed(() => {
  const sign = props.change > 0 ? '+' : ''
  return `${sign}${props.change.toFixed(2)}`
})

const formattedChangePercent = computed(() => {
  const sign = props.changePercent > 0 ? '+' : ''
  return `${sign}${props.changePercent.toFixed(2)}%`
})
</script>

<style lang="scss" scoped>
.as-quote-header {
  background: $bg-card;
  padding: $s-4 $s-5;
}

/* ===== Stock Info ===== */
.as-quote-header__stock {
  display: flex;
  align-items: center;
  gap: $s-3;
}

.as-quote-header__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $primary, $primary-deep);
  flex-shrink: 0;
  overflow: hidden;
}

.as-quote-header__avatar-text {
  font-size: $font-size-lg;
  font-weight: 700;
  color: $white;
  line-height: 1;
}

.as-quote-header__meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex: 1;
  min-width: 0;
}

.as-quote-header__name-row {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.as-quote-header__name {
  font-size: $font-size-lg;
  font-weight: 700;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.as-quote-header__status {
  display: inline-flex;
  align-items: center;
  padding: 2rpx 12rpx;
  border-radius: $r-xs;
  background: $bg-soft;
  flex-shrink: 0;
}

.as-quote-header__status-text {
  font-size: 20rpx;
  color: $ink-soft;
  font-weight: 500;
}

.as-quote-header__code-row {
  display: flex;
  align-items: center;
  gap: $s-1;
}

.as-quote-header__market {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.as-quote-header__code {
  font-size: $font-size-xs;
  color: $ink-mute;
  font-family: $font-mono;
}

/* ===== Price Row ===== */
.as-quote-header__price-row {
  display: flex;
  align-items: baseline;
  gap: $s-3;
  margin-top: $s-4;
}

.as-quote-header__price {
  font-size: $font-size-3xl;
  font-weight: 800;
  font-family: $font-mono;
  line-height: $lh-tight;
  color: $ink;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
  &.is-flat { color: $flat; }
}

.as-quote-header__change {
  font-size: $font-size-lg;
  font-weight: 600;
  font-family: $font-mono;
  color: $ink;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
  &.is-flat { color: $flat; }
}

.as-quote-header__change-tag {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: $r-xs;

  &.is-up {
    background: $up-soft;
  }

  &.is-down {
    background: $down-soft;
  }

  &.is-flat {
    background: $bg-deep;
  }
}

.as-quote-header__change-tag-text {
  font-size: $font-size-xs;
  font-weight: 600;
  font-family: $font-mono;

  .is-up & { color: $up; }
  .is-down & { color: $down; }
  .is-flat & { color: $flat; }
}

/* ===== Metrics Row ===== */
.as-quote-header__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: $s-4;
  margin-top: $s-4;
}

.as-quote-header__metric {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.as-quote-header__metric-label {
  font-size: $font-size-xs;
  color: $ink-soft;
}

.as-quote-header__metric-value {
  font-size: $font-size-xs;
  font-family: $font-mono;
  color: $ink;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
  &.is-flat { color: $flat; }
}
</style>
