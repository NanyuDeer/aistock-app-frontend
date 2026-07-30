<template>
  <view class="as-stat-card" :class="{ 'is-hoverable': hoverable }">
    <view class="as-stat-card__header">
      <text class="as-stat-card__label">{{ label }}</text>
      <view v-if="trend" class="as-stat-card__trend" :class="`is-${trendType}`">
        <text class="as-stat-card__trend-text">{{ trend }}</text>
      </view>
    </view>
    <text class="as-stat-card__value" :class="`is-${valueType}`">{{ formattedValue }}</text>
    <view v-if="$slots.default || description" class="as-stat-card__footer">
      <slot>
        <text v-if="description" class="as-stat-card__desc">{{ description }}</text>
      </slot>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type TrendType = 'up' | 'down' | 'flat'
type ValueType = 'default' | 'up' | 'down' | 'gold' | 'primary'

const props = withDefaults(defineProps<{
  label: string
  value: string | number
  trend?: string
  trendType?: TrendType
  valueType?: ValueType
  description?: string
  hoverable?: boolean
}>(), {
  trend: '',
  trendType: 'flat',
  valueType: 'default',
  description: '',
  hoverable: true
})

const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString()
  }
  return props.value
})
</script>

<style lang="scss" scoped>
.as-stat-card {
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-2xl;
  padding: $s-5;
  transition: all $t-base;
  position: relative;
  overflow: hidden;
}

.as-stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6rpx;
  background: linear-gradient(90deg, $primary, $accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform $t-slow;
}

.is-hoverable:active {
  transform: translateY(-2rpx);
  box-shadow: $shadow-hover;
}

.is-hoverable:active::before {
  transform: scaleX(1);
}

/* ===== Header ===== */
.as-stat-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $s-3;
}

.as-stat-card__label {
  font-size: $font-size-sm;
  color: $ink-soft;
  font-weight: 500;
}

.as-stat-card__trend {
  display: inline-flex;
  align-items: center;
  padding: 2rpx 12rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  font-weight: 700;
  font-family: $font-mono;

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

.as-stat-card__trend-text {
  font-size: inherit;

  .is-up & { color: $up; }
  .is-down & { color: $down; }
  .is-flat & { color: $flat; }
}

/* ===== Value ===== */
.as-stat-card__value {
  display: block;
  font-size: $font-size-3xl;
  font-weight: 800;
  font-family: $font-mono;
  color: $ink;
  line-height: $lh-tight;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
  &.is-gold { color: $gold-deep; }
  &.is-primary { color: $primary; }
}

/* ===== Footer ===== */
.as-stat-card__footer {
  margin-top: $s-3;
}

.as-stat-card__desc {
  font-size: $font-size-xs;
  color: $ink-mute;
}
</style>